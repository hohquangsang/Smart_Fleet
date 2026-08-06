from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import eta, route
from .models.schemas import HealthResponse
from .services.eta_predictor import eta_predictor

app = FastAPI(
    title="SmartFleet AI Service",
    description="AI microservice for ETA prediction and route optimization",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(eta.router, prefix="/api", tags=["ETA Prediction"])
app.include_router(route.router, prefix="/api", tags=["Route Optimization"])


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": eta_predictor.is_model_loaded,
    }


@app.get("/")
async def root():
    return {"message": "SmartFleet AI Service", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
