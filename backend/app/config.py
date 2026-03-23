from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    anthropic_api_key: Optional[str] = None
    gold_ticker: str = "GC=F"
    history_days: int = 365
    cache_ttl_seconds: int = 60
    forecast_cache_ttl: int = 3600

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
