from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from api import auth, topics, questions, answers, reports
from api.admin.router import router as admin_router
from core.config import settings
from core.database import async_engine, Base

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend_web" / "dist"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so Base is aware of them before create_all
    import models  # noqa: F401

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Path(settings.AUDIO_TEMP_DIR).mkdir(parents=True, exist_ok=True)
    yield

def _mount_frontend() -> None:
    if not FRONTEND_DIST.is_dir():
        return
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Let existing API routes handle these; only unmatched GETs reach here
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")

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
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


_mount_frontend()
