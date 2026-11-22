"""Settings, read from environment variables / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://upkept:upkept@localhost:5432/upkept"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    access_token_minutes: int = 30
    refresh_token_days: int = 30

    encryption_keys: str = ""  # "v2:base64,v1:base64" newest first

    s3_endpoint_url: str | None = None
    s3_bucket: str = "upkept-documents"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_region: str = "auto"

    ai_provider: str = "rules"  # rules | anthropic
    anthropic_api_key: str | None = None
    ai_model: str = "claude-haiku-5-5"
    ai_monthly_budget_usd: float = 50
    free_plan_ai_scans_per_month: int = 10

    resend_api_key: str | None = None
    email_from: str = "Upkept <reminders@upkept.app>"

    content_dir: Path = Path(__file__).resolve().parents[2] / "content"
    reminder_send_hour: int = 9

    cors_origins: str = "http://localhost:3000,http://localhost:8081"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_production:
        if s.jwt_secret == "change-me" or len(s.jwt_secret) < 32:
            raise RuntimeError("JWT_SECRET must be set to a long random value in production")
        if not s.encryption_keys:
            raise RuntimeError("ENCRYPTION_KEYS must be set in production")
    return s
