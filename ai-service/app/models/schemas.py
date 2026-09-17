from pydantic import BaseModel, Field
from typing import Optional, Literal


class ETAPredictionRequest(BaseModel):
    order_id: Optional[str] = None  # For logging/tracing
    distance_km: float = Field(..., gt=0, description="ORS route distance in km")
    base_eta_min: int = Field(..., gt=0, description="Base ETA in minutes")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour 0–23")
    day_of_week: int = Field(..., ge=0, le=6, description="Mon=0 … Sun=6 (Python weekday)")
    pickup_lat: float = Field(..., ge=-90, le=90)
    pickup_lng: float = Field(..., ge=-180, le=180)
    dropoff_lat: float = Field(..., ge=-90, le=90)
    dropoff_lng: float = Field(..., ge=-180, le=180)
    vehicle_type: Literal["motorcycle", "car", "van", "truck"] = "motorcycle"
    current_speed: float = Field(default=0.0, ge=0, description="Current speed km/h")


class ETAPredictionResponse(BaseModel):
    ai_eta_min: int
    confidence: float
    factors: dict


class RouteOptimizationRequest(BaseModel):
    driver_location: dict  # {"lat": float, "lng": float}
    waypoints: list[dict]  # [{"order_id": str, "lat": float, "lng": float, "type": str}]
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    vehicle_type: Literal["motorcycle", "car", "van", "truck"] = "motorcycle"


class RouteOptimizationResponse(BaseModel):
    optimized_order: list[str]
    total_distance_km: float
    estimated_time_min: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
