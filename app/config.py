import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./meli_sync.db")
    SCRAPEDO_TOKEN: str = os.environ.get("SCRAPEDO_TOKEN", "")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
