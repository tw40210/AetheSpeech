"""
Background job implementations (Flow 2 & Flow 3).

Jobs are queued by writing rows with status="pending" in Postgres.
The worker process (worker.runner) claims and runs them.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update

from core.config import settings
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
from worker.db import get_sync_db

logger = logging.getLogger(__name__)


def fetch_assessments(db, answer_ids: list[uuid.UUID]) -> list[AnswerAssessment]:
    if not answer_ids:
        return []
    return (
        db.query(AnswerAssessment)
        .filter(AnswerAssessment.id.in_(answer_ids))
        .all()
    )


def assessments_ready(assessments: list[AnswerAssessment], expected: int) -> bool:
    if len(assessments) < expected:
        return False
    return all(a.status in ("done", "failed") for a in assessments)


def run_process_answer(answer_id: str) -> None:
    """
    Flow 2: transcribe, label, rephrase. Expects the row to be status=processing.
    """
    logger.info("process_answer started for %s", answer_id)

    with get_sync_db() as db:
        assessment = db.get(AnswerAssessment, uuid.UUID(answer_id))
        if not assessment:
            logger.error("AnswerAssessment %s not found", answer_id)
            return

        try:
            if not assessment.audio_path:
                raise ValueError("No audio path stored for assessment")

            raw_transcript = transcribe_audio(assessment.audio_path)
            assessment.raw_transcript = raw_transcript
            db.commit()

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

            labeled = label_transcript(raw_transcript, labels)
            assessment.labeled_transcript = labeled
            db.commit()

            rephrased = rephrase_transcript(question_text, raw_transcript, labels)
            assessment.rephrased_transcript = rephrased
            db.commit()

            delete_audio(assessment.audio_path)

            assessment.status = "done"
            db.commit()
            logger.info("process_answer completed for %s", answer_id)

        except Exception as exc:
            assessment.status = "failed"
            assessment.error_message = str(exc)
            db.commit()
            logger.exception("process_answer failed for %s: %s", answer_id, exc)


def run_generate_report(report_id: str) -> None:
    """
    Flow 3: aggregate assessments and generate suggestions.
    Expects the report to be status=processing (claimed by the runner).
    """
    logger.info("generate_report started for %s", report_id)

    with get_sync_db() as db:
        report = db.get(SuggestionReport, uuid.UUID(report_id))
        if not report:
            logger.error("SuggestionReport %s not found", report_id)
            return

        try:
            answer_ids = [uuid.UUID(aid) for aid in report.answer_ids]
            assessments = fetch_assessments(db, answer_ids)

            if not assessments_ready(assessments, len(answer_ids)):
                raise RuntimeError(
                    f"Report {report_id} is not ready "
                    f"({len(assessments)}/{len(answer_ids)} assessments terminal)"
                )

            question_ids = [
                a.question_id for a in assessments if a.question_id is not None
            ]
            questions_map: dict[str, Question] = {}
            if question_ids:
                qs = db.query(Question).filter(Question.id.in_(question_ids)).all()
                questions_map = {str(q.id): q for q in qs}

            summary_text = build_assessment_summary(assessments, questions_map)
            suggestions = generate_suggestions(summary_text, len(answer_ids))
            report.suggestions = suggestions
            report.status = "done"
            db.commit()
            logger.info("generate_report completed for %s", report_id)

        except Exception as exc:
            report.status = "failed"
            report.error_message = str(exc)
            db.commit()
            logger.exception("generate_report failed for %s: %s", report_id, exc)


def report_wait_timed_out(report: SuggestionReport, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    created = report.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    deadline = created + timedelta(seconds=settings.REPORT_POLL_TIMEOUT_SECONDS)
    return now >= deadline


def try_claim_report(db, report_id: uuid.UUID) -> bool:
    result = db.execute(
        update(SuggestionReport)
        .where(
            SuggestionReport.id == report_id,
            SuggestionReport.status == "pending",
        )
        .values(status="processing")
    )
    return result.rowcount == 1


def claim_next_answer(db) -> uuid.UUID | None:
    assessment = db.execute(
        select(AnswerAssessment)
        .where(AnswerAssessment.status == "pending")
        .order_by(AnswerAssessment.created_at)
        .with_for_update(skip_locked=True)
        .limit(1)
    ).scalar_one_or_none()
    if assessment is None:
        return None
    assessment.status = "processing"
    return assessment.id
