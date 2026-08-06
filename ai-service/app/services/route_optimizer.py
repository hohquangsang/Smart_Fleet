from ..utils.geo_utils import haversine_distance


def optimize_route(driver_location: dict, waypoints: list[dict]) -> dict:
    """
    Simple nearest-neighbor route optimization.
    For production, replace with OR-Tools or a proper TSP solver.

    Args:
        driver_location: {"lat": float, "lng": float}
        waypoints: [{"order_id": str, "lat": float, "lng": float, "type": str}, ...]

    Returns:
        Optimized order of waypoints with total distance and time.
    """
    if not waypoints:
        return {
            "optimized_order": [],
            "total_distance_km": 0,
            "estimated_time_min": 0,
        }

    # Nearest neighbor algorithm
    remaining = list(waypoints)
    optimized = []
    current_lat = driver_location["lat"]
    current_lng = driver_location["lng"]
    total_distance = 0

    while remaining:
        # Find nearest waypoint
        nearest_idx = 0
        nearest_dist = float("inf")

        for i, wp in enumerate(remaining):
            dist = haversine_distance(current_lat, current_lng, wp["lat"], wp["lng"])
            if dist < nearest_dist:
                nearest_dist = dist
                nearest_idx = i

        nearest = remaining.pop(nearest_idx)
        optimized.append(f"{nearest['order_id']}-{nearest['type']}")
        total_distance += nearest_dist
        current_lat = nearest["lat"]
        current_lng = nearest["lng"]

    # Estimate time: average 30 km/h in city
    estimated_time = int(round((total_distance / 30) * 60))

    return {
        "optimized_order": optimized,
        "total_distance_km": round(total_distance, 2),
        "estimated_time_min": max(1, estimated_time),
    }
