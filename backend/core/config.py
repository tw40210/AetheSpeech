from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aethespeech:password@localhost:5432/aethespeech"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://aethespeech:password@localhost:5432/aethespeech"
    REDIS_URL: str = "redis://localhost:6379"
    OPENROUTER_API_KEY: str = ""
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Interview configuration
    PREP_TIME_SECONDS: int = 15
    RECORD_TIME_SECONDS: int = 90
    QUESTIONS_PER_SESSION: int = 10

    AUDIO_TEMP_DIR: str = "/tmp/aethespeech_audio"

    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    WHISPER_MODEL: str = "openai/whisper-large-v3-turbo"
    LLM_MODEL: str = "deepseek/deepseek-r1-0528"

    XML_LABEL_MAX_RETRIES: int = 3
    REPORT_POLL_TIMEOUT_SECONDS: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
