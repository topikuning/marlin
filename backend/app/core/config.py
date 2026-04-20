from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://knmp_user:knmp_secure_password@localhost:5432/marlin_db"
    SECRET_KEY: str   = "your-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str    = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 jam

    APP_NAME: str = "MARLIN"
    VERSION: str  = "2.0.0"
    DEBUG: bool   = False

    class Config:
        env_file = ".env"
        extra    = "ignore"


settings = Settings()