from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    MODEL_PATH: str = "app/models/trained/xgboost_eta.pkl"
    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"


settings = Settings()
