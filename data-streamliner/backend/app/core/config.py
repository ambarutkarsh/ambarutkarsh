from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    APP_VERSION: str = "1.0.0"

    SECRET_KEY: str = "change-this-to-a-random-64-char-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CONFIG_DB_HOST: str = "postgres"
    CONFIG_DB_PORT: int = 5432
    CONFIG_DB_NAME: str = "streamliner_config"
    CONFIG_DB_USER: str = "streamliner"
    CONFIG_DB_PASSWORD: str = "change-this-password"

    ENCRYPTION_KEY: str = "change-this-to-a-random-32-char-k"

    REDIS_URL: str = "redis://redis:6379"
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300

    MAX_QUERY_ROWS: int = 10000
    MAX_EXPORT_ROWS: int = 100000
    QUERY_TIMEOUT: int = 30

    LOG_LEVEL: str = "INFO"

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


settings = Settings()
