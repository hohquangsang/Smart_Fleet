from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    MODEL_PATH: str = "app/models/trained/xgboost_eta.pkl"
    LOG_LEVEL: str = "info"
    # Comma-separated origins; set to specific domains in production.
    # Example .env:  ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
    ALLOWED_ORIGINS: list[str] = ["*"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        """Allow ALLOWED_ORIGINS to be supplied as a comma-separated string in .env."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"


settings = Settings()
