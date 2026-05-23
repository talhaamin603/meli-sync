"""Loads settings - temporarily hardcoded for testing."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:mysecretpassword@localhost:5432/meli_sync"
    RAPIDAPI_KEY: str = "ec4dddb47cmsh91ae4af235f0349p18e772jsn42aa656e6222"
    RAPIDAPI_HOST: str = "real-time-amazon-data.p.rapidapi.com"
    JWT_SECRET: str = "dev-secret"

    class Config:
        pass  # Don't load from .env file for now


settings = Settings()
