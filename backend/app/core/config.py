import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    APP_NAME: str = Field(default="Municipal Cemetery Management System (San Carlos & Cachapoal)")
    APP_VERSION: str = Field(default="1.0.0")
    API_V1_STR: str = Field(default="/api/v1")

    # Security & Tokens
    SECRET_KEY: str = Field(default="change-this-ultra-secure-secret-key-for-production-min-32-chars-hex")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=480)
    ALGORITHM: str = Field(default="HS256")
    AUDIT_HMAC_SECRET: str = Field(default="cemetery-hmac-sha256-audit-secret-key-32bytes-min")
    TOTP_ISSUER: str = Field(default="Cementerio Municipal San Carlos")

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://cem_admin:cem_secure_password_2026@localhost:5432/cem_db"
    )
    SQLITE_TEST_DB: str = Field(default="sqlite:///./test_cemetery.db")

    # S3 Object Storage
    S3_ENDPOINT_URL: Optional[str] = Field(default="http://localhost:9000")
    S3_ACCESS_KEY: Optional[str] = Field(default="minio_admin")
    S3_SECRET_KEY: Optional[str] = Field(default="minio_secure_password_2026")
    S3_BUCKET_NAME: str = Field(default="cementerio-documentos")
    S3_REGION: str = Field(default="us-east-1")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:3000"]
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = Settings()
