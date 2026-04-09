from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
BACKEND_ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    database_url: str = "sqlite:///./vinmec_ai.db"
    app_env: str = "dev"
    allow_origins: str = "http://localhost:3000"
    emergency_hotline: str = "115"
    vinmec_hotline: str = "1900 2345"
    low_confidence_threshold: float = 0.65

    # Use absolute env path so settings do not depend on process working directory.
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
