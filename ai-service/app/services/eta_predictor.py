import os
import joblib
import numpy as np
from ..config import settings
from ..utils.feature_engineering import extract_features, get_traffic_factors


class ETAPredictor:
    """XGBoost-based ETA prediction service."""

    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load pre-trained XGBoost model, or use rule-based fallback."""
        model_path = settings.MODEL_PATH

        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
            print(f"✅ XGBoost model loaded from {model_path}")
        else:
            self.model = None
            print(f"⚠️  No trained model found at {model_path}. Using rule-based fallback.")

    def predict(self, data: dict) -> dict:
        """
        Predict ETA using XGBoost model or rule-based fallback.

        Returns:
            dict with ai_eta_min, confidence, and factors
        """
        factors = get_traffic_factors(data)

        if self.model is not None:
            # Use trained model
            features = extract_features(data)
            prediction = self.model.predict(features)[0]
            ai_eta_min = max(1, int(round(prediction)))

            return {
                "ai_eta_min": ai_eta_min,
                "confidence": 0.85,
                "factors": factors,
            }
        else:
            # Rule-based fallback
            return self._rule_based_prediction(data, factors)

    def _rule_based_prediction(self, data: dict, factors: dict) -> dict:
        """
        Simple rule-based ETA prediction when no ML model is available.
        Adjusts base ETA based on time of day, day of week, and vehicle type.
        """
        base_eta = data["base_eta_min"]
        hour = data["hour_of_day"]
        day = data["day_of_week"]

        multiplier = 1.0

        # Rush hour adjustment
        if 7 <= hour <= 9:
            multiplier += 0.25
        elif 17 <= hour <= 19:
            multiplier += 0.35
        elif 22 <= hour or hour <= 5:
            multiplier -= 0.15

        # Weekend adjustment
        if day in [0, 6]:
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
