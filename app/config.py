"""Loads settings from environment variables."""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = None
    RAPIDAPI_KEY: str = "ec4dddb47cmsh91ae4af235f0349p18e772jsn42aa656e6222"
    RAPIDAPI_HOST: str = "real-time-amazon-data.p.rapidapi.com"
    JWT_SECRET: str = "dev-secret"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
