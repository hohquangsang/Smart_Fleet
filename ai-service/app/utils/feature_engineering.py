import numpy as np
from ..utils.geo_utils import haversine_distance


# Vehicle type encoding — must match training data encoding
VEHICLE_ENCODING = {
    "motorcycle": 0,
    "car": 1,
    "van": 2,
    "truck": 3,
}

# day_of_week convention: Python datetime.weekday() — Mon=0, Tue=1, … Sat=5, Sun=6
WEEKEND_DAYS = {5, 6}  # Saturday, Sunday


def extract_features(data: dict) -> np.ndarray:
    """
    Extract features from request data for XGBoost prediction.

    Features:
    0. distance_km
    1. base_eta_min
    2. hour_of_day
    3. day_of_week       (Mon=0 … Sun=6)
    4. is_rush_hour      (binary: 1 if 7–9h or 17–19h)
    5. is_weekend        (binary: 1 if Sat or Sun)
    6. straight_line_distance (haversine km)
    7. detour_ratio      (ors_distance / haversine)
    8. vehicle_type_encoded
    9. current_speed     (km/h; 0 if not provided)
    """
    straight_line = haversine_distance(
        data["pickup_lat"], data["pickup_lng"],
        data["dropoff_lat"], data["dropoff_lng"]
    )

    # Avoid division by zero for very close points
    detour_ratio = data["distance_km"] / max(straight_line, 0.1)

    hour = data["hour_of_day"]
    is_rush_hour = 1 if (7 <= hour <= 9) or (17 <= hour <= 19) else 0
    is_weekend = 1 if data["day_of_week"] in WEEKEND_DAYS else 0

    vehicle_encoded = VEHICLE_ENCODING.get(data.get("vehicle_type", "motorcycle"), 0)

    features = np.array([
        data["distance_km"],
        data["base_eta_min"],
        hour,
        data["day_of_week"],
        is_rush_hour,
        is_weekend,
        straight_line,
        detour_ratio,
        vehicle_encoded,
        data.get("current_speed", 0.0),
    ]).reshape(1, -1)

    return features


def get_traffic_factors(data: dict) -> dict:
    """
    Determine human-readable traffic factors.
    day_of_week: Mon=0 … Sun=6 (Python datetime.weekday() convention).
    """
    hour = data["hour_of_day"]
    factors = {}

    if 7 <= hour <= 9:
        factors["time_of_day"] = "morning rush hour"
        factors["traffic_impact"] = "+5-10 min"
    elif 17 <= hour <= 19:
        factors["time_of_day"] = "evening rush hour"
        factors["traffic_impact"] = "+5-15 min"
    elif hour >= 22 or hour <= 5:
        factors["time_of_day"] = "late night"
        factors["traffic_impact"] = "-3-5 min"
    else:
        factors["time_of_day"] = "normal"
        factors["traffic_impact"] = "none"

    # Saturday=5, Sunday=6 (Python weekday)
    if data.get("day_of_week") in WEEKEND_DAYS:
        factors["weekend"] = "less traffic expected"

    return factors
