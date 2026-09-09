"""
Central app configuration.
Loaded once, imported everywhere via `from app.core.config import settings`.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://setu_user:setu_pass@localhost:5432/setu_ai"
    GEMINI_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
