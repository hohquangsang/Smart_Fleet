from fastapi import APIRouter
from ..models.schemas import ETAPredictionRequest, ETAPredictionResponse
from ..services.eta_predictor import eta_predictor

router = APIRouter()


@router.post("/predict-eta", response_model=ETAPredictionResponse)
async def predict_eta(request: ETAPredictionRequest):
    """Predict ETA using XGBoost model or rule-based fallback."""
    data = request.model_dump()
    result = eta_predictor.predict(data)
    return result
