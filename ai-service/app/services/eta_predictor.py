import os
import logging
import joblib
import numpy as np
from fastapi import HTTPException
from ..config import settings
from ..utils.feature_engineering import extract_features, get_traffic_factors

logger = logging.getLogger(__name__)


class ETAPredictor:
    """XGBoost-based ETA prediction service."""

    def __init__(self):
        self.model = None
        self._model_confidence_base = 0.80  # Calibrated offline; update after retraining
        self._load_model()

    def _load_model(self):
        """Load pre-trained XGBoost model, or use rule-based fallback."""
        model_path = settings.MODEL_PATH

        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            logger.info("XGBoost model loaded from %s", model_path)
        else:
            self.model = None
            logger.warning(
                "No trained model found at %s. Using rule-based fallback.", model_path
            )

    def predict(self, data: dict) -> dict:
        """
        Predict ETA using XGBoost model or rule-based fallback.

        Returns:
            dict with ai_eta_min, confidence, and factors
        """
        try:
            factors = get_traffic_factors(data)

            if self.model is not None:
                result = self._model_prediction(data, factors)
            else:
                result = self._rule_based_prediction(data, factors)

            logger.info(
                "ETA predicted | order=%s distance=%.2fkm hour=%d day=%d "
                "vehicle=%s → %d min (conf=%.2f)",
                data.get("order_id", "N/A"),
                data.get("distance_km", 0),
                data.get("hour_of_day", 0),
                data.get("day_of_week", 0),
                data.get("vehicle_type", "unknown"),
                result["ai_eta_min"],
                result["confidence"],
            )
            return result

        except Exception as exc:
            logger.exception("ETA prediction failed for order %s", data.get("order_id"))
            raise HTTPException(status_code=500, detail=f"ETA prediction error: {exc}") from exc

    def _model_prediction(self, data: dict, factors: dict) -> dict:
        """Run XGBoost inference and compute dynamic confidence."""
        features = extract_features(data)
        raw = self.model.predict(features)[0]
        ai_eta_min = max(1, int(round(raw)))

        # Dynamic confidence: penalise high detour ratios (unreliable routes)
        detour_ratio = features[0, 7]  # index 7 = detour_ratio
        confidence = round(
            max(0.50, min(0.95, self._model_confidence_base - 0.05 * (detour_ratio - 1))),
            2,
        )

        return {
            "ai_eta_min": ai_eta_min,
            "confidence": confidence,
            "factors": factors,
        }

    def _rule_based_prediction(self, data: dict, factors: dict) -> dict:
        """
        Simple rule-based ETA prediction when no ML model is available.
        Adjusts base ETA based on time of day, day of week, and vehicle type.

        Convention: day_of_week follows Python datetime.weekday() — Mon=0, Sun=6.
        """
        base_eta = data["base_eta_min"]
        hour = data["hour_of_day"]
        day = data["day_of_week"]  # Mon=0 … Sun=6

        multiplier = 1.0

        # Rush hour adjustment
        if 7 <= hour <= 9:
            multiplier += 0.25   # +25% morning rush
        elif 17 <= hour <= 19:
            multiplier += 0.35   # +35% evening rush
        elif hour >= 22 or hour <= 5:
            multiplier -= 0.15   # -15% late night

        # Weekend adjustment — Saturday=5, Sunday=6 (Python weekday)
        if day in [5, 6]:
            multiplier -= 0.10

        # Vehicle type adjustment
        vehicle_factors = {
            "motorcycle": 0.85,  # Faster in traffic
            "car": 1.0,
            "van": 1.10,
            "truck": 1.25,
        }
        multiplier *= vehicle_factors.get(data.get("vehicle_type", "motorcycle"), 1.0)

        ai_eta = max(1, int(round(base_eta * multiplier)))

        return {
            "ai_eta_min": ai_eta,
            "confidence": 0.65,  # Lower confidence for rule-based
            "factors": factors,
        }

    @property
    def is_model_loaded(self) -> bool:
        return self.model is not None


# Singleton instance
eta_predictor = ETAPredictor()
