import os
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    MONGO_URI: str = Field(..., env="MONGO_URI")
    DATABASE_NAME: str = Field("african_nations", env="DATABASE_NAME")


    # Mail
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str | None = None
    MAIL_PORT: int = 2525
    MAIL_SERVER: str | None = None
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False


    # CORS / Frontend
    CORS_ORIGIN: str = "http://localhost:5173"


    # JWT
    JWT_SECRET: str = Field("supersecret_replace_me_with_long_random_string", env="JWT_SECRET")
    JWT_ALGORITHM: str = Field("HS256", env="JWT_ALGORITHM")
    JWT_EXP_MINUTES: int = Field(60, env="JWT_EXP_MINUTES")


    # Admin basic
    ADMIN_USERNAME: str = Field("admin", env="ADMIN_USERNAME")
    ADMIN_PASSWORD: str = Field("admin123", env="ADMIN_PASSWORD")


settings = Settings()