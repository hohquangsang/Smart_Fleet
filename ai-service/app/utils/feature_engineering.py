import numpy as np
from ..utils.geo_utils import haversine_distance


# Vehicle type encoding
VEHICLE_ENCODING = {
    "motorcycle": 0,
    "car": 1,
    "van": 2,
    "truck": 3,
}


def extract_features(data: dict) -> np.ndarray:
    """
    Extract features from request data for XGBoost prediction.

    Features:
    0. distance_km
    1. base_eta_min
    2. hour_of_day
    3. day_of_week
    4. is_rush_hour (binary)
    5. is_weekend (binary)
    6. straight_line_distance (haversine)
    7. detour_ratio (ors_distance / haversine)
    8. vehicle_type_encoded
    9. current_speed
    """
    straight_line = haversine_distance(
        data["pickup_lat"], data["pickup_lng"],
        data["dropoff_lat"], data["dropoff_lng"]
    )

    detour_ratio = data["distance_km"] / max(straight_line, 0.1)

    hour = data["hour_of_day"]
    is_rush_hour = 1 if (7 <= hour <= 9) or (17 <= hour <= 19) else 0
    is_weekend = 1 if data["day_of_week"] in [0, 6] else 0  # Sunday=0, Saturday=6

    vehicle_encoded = VEHICLE_ENCODING.get(data["vehicle_type"], 0)

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
        data.get("current_speed", 0),
    ]).reshape(1, -1)

    return features


def get_traffic_factors(data: dict) -> dict:
    """Determine human-readable traffic factors."""
    hour = data["hour_of_day"]
    factors = {}

    if 7 <= hour <= 9:
        factors["time_of_day"] = "morning rush hour"
        factors["traffic_impact"] = "+5-10 min"
    elif 17 <= hour <= 19:
        factors["time_of_day"] = "evening rush hour"
        factors["traffic_impact"] = "+5-15 min"
    elif 22 <= hour or hour <= 5:
        factors["time_of_day"] = "late night"
        factors["traffic_impact"] = "-3-5 min"
    else:
        factors["time_of_day"] = "normal"
        factors["traffic_impact"] = "none"

    if data.get("day_of_week") in [0, 6]:
        factors["weekend"] = "less traffic expected"

    return factors
