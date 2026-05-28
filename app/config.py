# """Loads settings - temporarily hardcoded for testing."""
# from pydantic_settings import BaseSettings


# class Settings(BaseSettings):
#     DATABASE_URL: str = "postgresql://postgres:mysecretpassword@localhost:5432/meli_sync"
#     RAPIDAPI_KEY: str = "ec4dddb47cmsh91ae4af235f0349p18e772jsn42aa656e6222"
#     RAPIDAPI_HOST: str = "real-time-amazon-data.p.rapidapi.com"
#     JWT_SECRET: str = "dev-secret"

#     class Config:
#         pass  # Don't load from .env file for now


# settings = Settings()








"""Loads settings from environment variables."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Read DATABASE_URL from environment variable, fallback to localhost for development
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql://postgres:mysecretpassword@localhost:5432/meli_sync")
    RAPIDAPI_KEY: str = os.environ.get("RAPIDAPI_KEY", "ec4dddb47cmsh91ae4af235f0349p18e772jsn42aa656e6222")
    RAPIDAPI_HOST: str = os.environ.get("RAPIDAPI_HOST", "real-time-amazon-data.p.rapidapi.com")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret")

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()