from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)
    SECRET_KEY: str = Field(default="change-this-to-a-random-64-char-string")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=480)

    CONFIG_DB_HOST: str = Field(default="postgres")
    CONFIG_DB_PORT: int = Field(default=5432)
    CONFIG_DB_NAME: str = Field(default="streamliner_config")
    CONFIG_DB_USER: str = Field(default="streamliner")
    CONFIG_DB_PASSWORD: str = Field(default="change-this-password")

    ENCRYPTION_KEY: str = Field(default="change-this-to-a-random-32-char-key-!")

    REDIS_URL: str = Field(default="redis://redis:6379")
    CACHE_ENABLED: bool = Field(default=True)
    CACHE_TTL: int = Field(default=300)

    MAX_QUERY_ROWS: int = Field(default=10000)
    MAX_EXPORT_ROWS: int = Field(default=100000)
    QUERY_TIMEOUT: int = Field(default=30)

    LOG_LEVEL: str = Field(default="INFO")

    APP_VERSION: str = "1.0.0"
    APP_NAME: str = "Star Health Data Streamliner"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.CONFIG_DB_USER}:{self.CONFIG_DB_PASSWORD}"
            f"@{self.CONFIG_DB_HOST}:{self.CONFIG_DB_PORT}/{self.CONFIG_DB_NAME}"
        )

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.CONFIG_DB_USER}:{self.CONFIG_DB_PASSWORD}"
            f"@{self.CONFIG_DB_HOST}:{self.CONFIG_DB_PORT}/{self.CONFIG_DB_NAME}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
