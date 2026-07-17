from functools import lru_cache
from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_host: str = "localhost"
    postgres_port: int = 55432
    postgres_user: str = "astraos"
    postgres_password: str = "astraos"
    postgres_db: str = "astraos"
    database_url: str | None = None

    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "astraos_documents_qwen3_8b"

    embedding_base_url: str = "https://openrouter.ai/api/v1"
    embedding_api_key: str | None = None
    embedding_model: str = "qwen/qwen3-embedding-8b"
    embedding_path: str = "/embeddings"
    embedding_vector_size: int = 4096
    embedding_provider: str = "openai_compatible"
    embedding_http_referer: str | None = None
    embedding_app_title: str = "AstraOS"

    llm_provider: str = "openai_compatible"
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str | None = None
    llm_chat_path: str = "/chat/completions"
    llm_default_model: str = "qwen/qwen3-32b"
    llm_model_fast: str = "qwen/qwen3-32b"
    llm_model_reasoning: str = "qwen/qwen3-235b-a22b"
    llm_model_coding: str = "qwen/qwen3-coder"
    llm_model_long_context: str = "qwen/qwen3-235b-a22b"
    llm_timeout_seconds: float = 60.0
    llm_temperature: float = 0.7
    llm_max_tokens: int = 4096
    llm_http_referer: str | None = None
    llm_app_title: str = "AstraOS"

    file_storage_path: str = "services/api/.data/uploads"
    tmp_storage_path: str = "services/api/.data/tmp"
    document_chunk_size: int = 1200
    document_chunk_overlap: int = 160
    max_upload_file_size_mb: int = 20
    allowed_document_content_types: str = (
        "text/plain,text/markdown,application/markdown,application/pdf"
    )

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    frontend_origin: str = "http://localhost:3000"
    frontend_dev_origins: str = "http://localhost:3000,http://localhost:3001"
    enable_mock_workspace_api: bool = False

    jwt_secret_key: str = "change-me-in-local-env-32-bytes-minimum"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    smtp_host: str = "smtp.qq.com"
    smtp_port: int = 465
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "AstraOS"
    smtp_use_ssl: bool = True
    smtp_use_starttls: bool = False
    email_verification_enabled: bool = False
    email_verification_code_ttl_minutes: int = 10
    email_verification_code_length: int = 6
    email_verification_max_attempts: int = 5
    email_verification_resend_cooldown_seconds: int = 60
    email_verification_log_code: bool = False

    @computed_field
    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            "postgresql+asyncpg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field
    @property
    def resolved_llm_api_key(self) -> str | None:
        return self.llm_api_key or self.embedding_api_key

    @computed_field
    @property
    def resolved_file_storage_path(self) -> Path:
        return self._resolve_repo_path(self.file_storage_path)

    @computed_field
    @property
    def resolved_tmp_storage_path(self) -> Path:
        return self._resolve_repo_path(self.tmp_storage_path)

    @computed_field
    @property
    def allowed_document_content_type_set(self) -> set[str]:
        return {
            content_type.strip()
            for content_type in self.allowed_document_content_types.split(",")
            if content_type.strip()
        }

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        origins = {self.frontend_origin}
        origins.update(
            origin.strip()
            for origin in self.frontend_dev_origins.split(",")
            if origin.strip()
        )
        return sorted(origins)

    @staticmethod
    def _resolve_repo_path(value: str) -> Path:
        path = Path(value).expanduser()
        if path.is_absolute():
            return path
        return REPO_ROOT / path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
