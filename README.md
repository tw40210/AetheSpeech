# AetheSpeech — AI Speech Assessment Platform

A mobile application that helps users practice structured oral presentations. Users select a topic, answer randomised questions, and receive AI-powered assessment reports with labeled transcripts and actionable suggestions.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Mobile frontend | Flutter (Material 3) |
| Web frontend | React 18 + MUI v5 |
| HTTP API | Python FastAPI |
| Background workers | Celery + Redis |
| Database | PostgreSQL 16 |
| AI — Transcription | OpenRouter → `openai/whisper-large-v3-turbo` |
| AI — Labeling / Suggestions | OpenRouter → `deepseek/deepseek-v4-flash` |

---

## Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Flutter 3.22+

---

## Quick Start

### 1. Start infrastructure (Postgres + Redis)

```bash
docker compose up -d
```

### 2. Set up backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your OpenRouter API key:

```bash
cp .env.example .env
# edit .env and set OPENROUTER_API_KEY
```

Initialise the database and seed topics/questions:

```bash
python init_db.py
```

Start the FastAPI server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Start the Celery worker (separate terminal):

```bash
sudo apt install celery

cd backend
source .venv/bin/activate
celery -A core.celery_app worker --loglevel=info --concurrency=4
```

### 3. Run backend tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

### 4. Set up and run Web frontend (React + MUI)

```bash
cd frontend_web
npm install
npm run dev
```

The web app runs at **http://localhost:3000**.

Update `src/core/constants.js` → `baseUrl` if the backend runs on a different host or port.

### 5. Set up and run Flutter frontend

```bash
cd frontend
flutter emulators --launch Medium_Phone_API_36.1
flutter pub get
flutter run
```

Update `lib/core/constants.dart` with your machine's IP if running on a physical device.

### 6. Run Flutter tests

```bash
cd frontend
flutter test
```

---

## Environment Variables (backend/.env)

```
DATABASE_URL=postgresql+asyncpg://aethespeech:password@localhost:5432/aethespeech
SYNC_DATABASE_URL=postgresql+psycopg2://aethespeech:password@localhost:5432/aethespeech
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=sk-or-...
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
AUDIO_TEMP_DIR=/tmp/aethespeech_audio
```

---

## Assessment Flows

### Flow 1 — User Interview
Pick topic → 15 s prep per question → 90 s recording → repeat × 10 → wait for report

### Flow 2 — Answer Assessment (Celery, runs per answer)
Audio → Whisper transcription → DeepSeek XML labeling (with retry) → DeepSeek rephrasing → save to DB

### Flow 3 — Report Generation (Celery, runs after batch submit)
Collect all Flow 2 results → DeepSeek suggestions → save report to DB
