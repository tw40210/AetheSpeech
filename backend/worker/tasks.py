"""
Celery tasks:
  - process_answer  → Flow 2 (transcription + XML labeling + rephrasing)
  - generate_report → Flow 3 (aggregate + suggestion generation)
"""

import time
import uuid
from contextlib import contextmanager

from celery.utils.log import get_task_logger

from core.celery_app import celery_app
from core.config import settings
from core.database import SyncSessionLocal
from core.topic_labels import ensure_default_unclear_label
from models.answer import AnswerAssessment
from models.report import SuggestionReport
from models.topic import Question, Topic
from services.ai_client import (
    generate_suggestions,
    label_transcript,
    rephrase_transcript,
    transcribe_audio,
)
from services.audio_service import delete_audio
from services.report_service import build_assessment_summary

logger = get_task_logger(__name__)


@contextmanager
def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Flow 2: Process a single answer ──────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def process_answer(self, answer_id: str):
    """
    Flow 2:
    1. Transcribe audio (Audio LLM)
    2. Label transcript with topic XML tags (Text LLM, with retry)
    3. Rephrase + label (Text LLM)
    4. Persist results to DB
    """
    logger.info("process_answer started for %s", answer_id)

    with get_sync_db() as db:
        assessment = db.get(AnswerAssessment, uuid.UUID(answer_id))
        if not assessment:
            logger.error("AnswerAssessment %s not found", answer_id)
            return

        assessment.status = "processing"
        db.commit()

        try:
            # ── Step 1: Transcription ─────────────────────────────────────
            if not assessment.audio_path:
                raise ValueError("No audio path stored for assessment")

            raw_transcript = transcribe_audio(assessment.audio_path)
            assessment.raw_transcript = raw_transcript
            db.commit()

            # ── Fetch labels for this question's topic (default to UNCLEAR) ────
            labels: list[dict] = []
            question_text = ""
            if assessment.question_id:
                question = db.get(Question, assessment.question_id)
                if question:
                    question_text = question.text
                    topic = db.get(Topic, question.topic_id)
                    if topic:
                        labels = ensure_default_unclear_label(topic.labels or [])

            labels = ensure_default_unclear_label(labels)

            # ── Step 2: XML Labeling ──────────────────────────────────────
            labeled = label_transcript(raw_transcript, labels)
            assessment.labeled_transcript = labeled
            db.commit()

            # ── Step 3: Rephrase ──────────────────────────────────────────
            rephrased = rephrase_transcript(question_text, raw_transcript, labels)
            assessment.rephrased_transcript = rephrased
            db.commit()

            # ── Cleanup audio ─────────────────────────────────────────────
            delete_audio(assessment.audio_path)

            assessment.status = "done"
            db.commit()
            logger.info("process_answer completed for %s", answer_id)

        except Exception as exc:
            assessment.status = "failed"
            assessment.error_message = str(exc)
            db.commit()
            logger.exception("process_answer failed for %s: %s", answer_id, exc)
            raise self.retry(exc=exc)


# ── Flow 3: Generate batch report ────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def generate_report(self, report_id: str):
    """
    Flow 3:
    1. Wait for all Flow 2 tasks to finish
    2. Collect assessment data
    3. Generate suggestions (Text LLM)
    4. Persist report to DB
    """
    logger.info("generate_report started for %s", report_id)

    with get_sync_db() as db:
        report = db.get(SuggestionReport, uuid.UUID(report_id))
        if not report:
            logger.error("SuggestionReport %s not found", report_id)
            return

        report.status = "processing"
        db.commit()

        try:
            answer_ids = [uuid.UUID(aid) for aid in report.answer_ids]

            # ── Step 1: Wait for all Flow 2 tasks ────────────────────────
            deadline = time.time() + settings.REPORT_POLL_TIMEOUT_SECONDS
            while time.time() < deadline:
                assessments = (
                    db.query(AnswerAssessment)
                    .filter(AnswerAssessment.id.in_(answer_ids))
                    .all()
                )
                statuses = {a.status for a in assessments}
                if statuses <= {"done", "failed"}:
                    break
                time.sleep(2)
                db.expire_all()
            else:
                raise TimeoutError("Timed out waiting for answer assessments to complete")

            # ── Step 2: Collect data ──────────────────────────────────────
            question_ids = [
                a.question_id for a in assessments if a.question_id is not None
            ]
            questions_map: dict[str, Question] = {}
            if question_ids:
                qs = db.query(Question).filter(Question.id.in_(question_ids)).all()
                questions_map = {str(q.id): q for q in qs}

            summary_text = build_assessment_summary(assessments, questions_map)

            # ── Step 3: Generate suggestions ─────────────────────────────
            suggestions = generate_suggestions(summary_text)
            report.suggestions = suggestions
            report.status = "done"
            db.commit()
            logger.info("generate_report completed for %s", report_id)

        except Exception as exc:
            report.status = "failed"
            report.error_message = str(exc)
            db.commit()
            logger.exception("generate_report failed for %s: %s", report_id, exc)
            raise self.retry(exc=exc)
