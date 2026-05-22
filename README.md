# AetheSpeech — AI Speech Assessment Platform

A mobile application that helps users practice structured oral presentations. Users select a topic, answer randomised questions, and receive AI-powered assessment reports with labeled transcripts and actionable suggestions.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Mobile frontend | Flutter (Material 3) |
| Web frontend | React 18 + MUI v5 |
| HTTP API | Python FastAPI |
| Background workers | Postgres-polled Python worker (`python -m worker`) |
| Database | PostgreSQL 16 |
| AI — Transcription | OpenRouter → `AUDIO LLM` |
| AI — Labeling / Suggestions | OpenRouter → `TEXT LLM` |

---

## Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Flutter 3.22+

---

## Quick Start

### 1. Start infrastructure (Postgres)

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
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Start the background worker (separate terminal):

```bash
cd backend
source .venv/bin/activate
python -m worker
```

The worker polls Postgres for `answer_assessments` and `suggestion_reports` rows with `status=pending`.

### 3. Run backend tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

### 4. Set up and run Web frontend (React + MUI)

```bash
cd frontend_web

npm run dev
```

The web app runs at **http://localhost:3000**.

Update `src/core/constants.ts` → `baseUrl` if the backend runs on a different host or port. When using `npm run dev`, API requests are proxied to port 8000 automatically.

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

### 7. Run on Prod server
```bash
docker compose up -d
cd ./backend && source .venv/bin/activate
sudo .venv/bin/python3 -m worker & uvicorn main:app --host 0.0.0.0 --port 8000
```

### 8. Develop pull
```
sudo git stash
sudo git pull origin
sudo git stash pop
```

## Environment Variables (backend/.env)

```
DATABASE_URL=postgresql+asyncpg://aethespeech:password@localhost:5432/aethespeech
SYNC_DATABASE_URL=postgresql+psycopg2://aethespeech:password@localhost:5432/aethespeech
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

### Flow 2 — Answer Assessment (worker, runs per answer)
Audio → Audio LLM transcription → Text LLM XML labeling (with retry) → Text LLM rephrasing → save to DB

### Flow 3 — Report Generation (worker, runs after batch submit)
Collect all Flow 2 results → Text LLM suggestions → save report to DB
