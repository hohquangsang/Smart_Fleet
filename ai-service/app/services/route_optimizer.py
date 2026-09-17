import logging
from ..utils.geo_utils import haversine_distance

logger = logging.getLogger(__name__)

# Average urban speeds (km/h) per vehicle type
VEHICLE_BASE_SPEED: dict[str, float] = {
    "motorcycle": 35.0,
    "car": 28.0,
    "van": 25.0,
    "truck": 22.0,
}


def _adaptive_speed(vehicle_type: str, hour: int | None) -> float:
    """
    Return estimated average speed (km/h) based on vehicle type and time of day.
    Uses Python weekday convention for hour (0–23).
    """
    base = VEHICLE_BASE_SPEED.get(vehicle_type, 28.0)

    if hour is None:
        return base

    if 7 <= hour <= 9 or 17 <= hour <= 19:  # Rush hours
        return base * 0.65
    if hour >= 22 or hour <= 5:             # Late night
        return base * 1.35
    return base


def optimize_route(
    driver_location: dict,
    waypoints: list[dict],
    hour_of_day: int | None = None,
    vehicle_type: str = "motorcycle",
) -> dict:
    """
    Nearest-neighbor route optimization with adaptive speed estimation.

    Args:
        driver_location: {"lat": float, "lng": float}
        waypoints: [{"order_id": str, "lat": float, "lng": float, "type": str}, ...]
        hour_of_day:  0–23 or None (None → use base speed)
        vehicle_type: one of motorcycle / car / van / truck

    Returns:
        Optimized order of waypoints with total distance and estimated time.
    """
    if not waypoints:
        return {
            "optimized_order": [],
            "total_distance_km": 0.0,
            "estimated_time_min": 0,
        }

    # Validate required waypoint fields
    for i, wp in enumerate(waypoints):
        for field in ("order_id", "lat", "lng", "type"):
            if field not in wp:
                raise ValueError(f"Waypoint #{i} is missing required field: '{field}'")

    avg_speed = _adaptive_speed(vehicle_type, hour_of_day)
    logger.debug(
        "Route optimization | waypoints=%d vehicle=%s hour=%s speed=%.1f km/h",
        len(waypoints), vehicle_type, hour_of_day, avg_speed,
    )

    # Nearest-neighbor greedy algorithm
    remaining = list(waypoints)
    optimized: list[str] = []
    current_lat = driver_location["lat"]
    current_lng = driver_location["lng"]
    total_distance = 0.0

    while remaining:
        nearest_idx = min(
            range(len(remaining)),
            key=lambda i: haversine_distance(
                current_lat, current_lng,
                remaining[i]["lat"], remaining[i]["lng"],
            ),
        )
        nearest = remaining.pop(nearest_idx)
        dist = haversine_distance(current_lat, current_lng, nearest["lat"], nearest["lng"])
        optimized.append(f"{nearest['order_id']}-{nearest['type']}")
        total_distance += dist
        current_lat = nearest["lat"]
        current_lng = nearest["lng"]

    estimated_time = int(round((total_distance / avg_speed) * 60))

    logger.info(
        "Route optimized | stops=%d total=%.2f km ≈%d min (speed=%.1f km/h)",
        len(optimized), total_distance, estimated_time, avg_speed,
    )

    return {
        "optimized_order": optimized,
        "total_distance_km": round(total_distance, 2),
        "estimated_time_min": max(1, estimated_time),
    }
