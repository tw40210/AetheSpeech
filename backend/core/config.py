from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aethespeech:password@localhost:5432/aethespeech"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://aethespeech:password@localhost:5432/aethespeech"
    OPENROUTER_API_KEY: str = ""
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Interview configuration
    PREP_TIME_SECONDS: int = 15
    RECORD_TIME_SECONDS: int = 180
    QUESTIONS_PER_SESSION: int = 10

    AUDIO_TEMP_DIR: str = "/tmp/aethespeech_audio"

    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    WHISPER_MODEL: str = "openai/whisper-large-v3-turbo"
    LLM_MODEL: str = "qwen/qwen3-235b-a22b-2507"

    XML_LABEL_MAX_RETRIES: int = 3
    XML_WORD_COUNT_DIFF_THRESHOLD: float = 0.1
    REPORT_POLL_TIMEOUT_SECONDS: int = 300
    WORKER_POLL_INTERVAL_SECONDS: int = 2

    # User-uploaded topics
    MAX_USER_TOPICS: int = 10

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
