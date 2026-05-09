from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth, topics, questions, answers, reports
from core.config import settings
from core.database import async_engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so Base is aware of them before create_all
    import models  # noqa: F401

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Path(settings.AUDIO_TEMP_DIR).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="AetheSpeech API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(topics.router)
app.include_router(questions.router)
app.include_router(answers.router)
app.include_router(reports.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
