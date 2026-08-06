from pydantic import BaseModel
from typing import Optional


class ETAPredictionRequest(BaseModel):
    distance_km: float
    base_eta_min: int
    hour_of_day: int
    day_of_week: int
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float
    vehicle_type: str = "motorcycle"
    current_speed: float = 0.0


class ETAPredictionResponse(BaseModel):
    ai_eta_min: int
    confidence: float
    factors: dict


class RouteOptimizationRequest(BaseModel):
    driver_location: dict
    waypoints: list[dict]


class RouteOptimizationResponse(BaseModel):
    optimized_order: list[str]
    total_distance_km: float
    estimated_time_min: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
