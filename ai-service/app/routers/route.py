from fastapi import APIRouter
from ..models.schemas import RouteOptimizationRequest, RouteOptimizationResponse
from ..services.route_optimizer import optimize_route

router = APIRouter()


@router.post("/optimize-route", response_model=RouteOptimizationResponse)
async def optimize(request: RouteOptimizationRequest):
    """Optimize delivery route order using nearest-neighbor algorithm."""
    result = optimize_route(request.driver_location, request.waypoints)
    return result
