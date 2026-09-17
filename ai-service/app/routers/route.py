from fastapi import APIRouter, HTTPException
from ..models.schemas import RouteOptimizationRequest, RouteOptimizationResponse
from ..services.route_optimizer import optimize_route

router = APIRouter()


@router.post("/optimize-route", response_model=RouteOptimizationResponse)
async def optimize(request: RouteOptimizationRequest):
    """Optimize delivery route order using nearest-neighbor algorithm."""
    try:
        result = optimize_route(
            driver_location=request.driver_location,
            waypoints=request.waypoints,
            hour_of_day=request.hour_of_day,
            vehicle_type=request.vehicle_type,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Route optimization error: {exc}") from exc
