"""
Admin workflow introspection and replay endpoints.

Allows the prompt-tuning lab to:
1. Load the full context + default payloads for an answer or report pipeline run.
2. Re-execute individual steps (or all steps from a given point) with overridden
   payloads, returning outputs synchronously.

Results are NOT written to the database.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin.dependencies import verify_admin
from core.config import settings
from core.database import get_db
from core.topic_labels import ensure_default_unclear_label
from models.answer import AnswerAssessment
from models.report import SuggestionReport
from models.topic import Question, Topic
from services.prompt_defaults import (
    build_label_payload,
    build_label_system_prompt,
    build_rephrase_payload,
    build_rephrase_system_prompt,
    build_suggestions_payload,
    build_suggestions_system_prompt,
)
from schemas.suggestions_schema import StructuredSuggestions, normalize_stored_suggestions
from services.report_service import build_assessment_summary
from services.workflow_runner import run_label_step, run_rephrase_step, run_suggestions_step

router = APIRouter(prefix="/workflows", tags=["admin-workflows"])


def _coerce_stored_suggestions(value) -> dict | None:
    if value is None:
        return None
    if isinstance(value, StructuredSuggestions):
        return value.model_dump()
    if isinstance(value, dict):
        return StructuredSuggestions.model_validate(
            normalize_stored_suggestions(value)
        ).model_dump()
    return None


# ── Pydantic models ───────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str
    content: str


class StepOverride(BaseModel):
    model: str | None = None
    temperature: float | None = None
    messages: list[ChatMessage] | None = None


class AnswerRunRequest(BaseModel):
    steps: list[str]
    transcript_override: str | None = None
    overrides: dict[str, StepOverride] = {}


class ReportRunRequest(BaseModel):
    steps: list[str]
    summary_override: str | None = None
    overrides: dict[str, StepOverride] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _merge_payload(default: dict, override: StepOverride | None) -> dict:
    """Apply an admin override on top of a default payload dict."""
    if override is None:
        return default
    merged = dict(default)
    if override.model is not None:
        merged["model"] = override.model
    if override.temperature is not None:
        merged["temperature"] = override.temperature
    if override.messages is not None:
        merged["messages"] = [m.model_dump() for m in override.messages]
    return merged


async def _load_answer_context(db: AsyncSession, answer_id: uuid.UUID):
    """Load assessment + linked question + topic. Returns (assessment, question, topic, labels)."""
    assessment = await db.get(AnswerAssessment, answer_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="AnswerAssessment not found")

    question: Question | None = None
    topic: Topic | None = None
    labels: list[dict] = []

    if assessment.question_id:
        question = await db.get(Question, assessment.question_id)
        if question:
            topic = await db.get(Topic, question.topic_id)
            if topic:
                labels = ensure_default_unclear_label(topic.labels or [])

    labels = ensure_default_unclear_label(labels)
    return assessment, question, topic, labels


# ── Answer workflow ───────────────────────────────────────────────────────────


@router.get("/answer/{answer_id}", dependencies=[Depends(verify_admin)])
async def get_answer_workflow(
    answer_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Return the full context, default step payloads, and current DB outputs
    for an answer_assessments pipeline run.
    """
    assessment, question, topic, labels = await _load_answer_context(db, answer_id)

    transcript = assessment.raw_transcript or ""
    question_text = question.text if question else ""

    label_payload = build_label_payload(transcript, labels) if transcript else None
    rephrase_payload = build_rephrase_payload(question_text, transcript, labels) if transcript else None

    return {
        "assessment": {
            "id": str(assessment.id),
            "status": assessment.status,
            "audio_path": assessment.audio_path,
            "raw_transcript": assessment.raw_transcript,
            "labeled_transcript": assessment.labeled_transcript,
            "rephrased_transcript": assessment.rephrased_transcript,
            "error_message": assessment.error_message,
            "created_at": assessment.created_at.isoformat(),
        },
        "question": {
            "id": str(question.id),
            "text": question.text,
            "context": question.context,
        } if question else None,
        "topic": {
            "id": str(topic.id),
            "name": topic.name,
            "labels": topic.labels,
        } if topic else None,
        "default_payloads": {
            # transcribe step: audio is deleted after worker completes; shown as null
            "transcribe": None,
            "label": label_payload,
            "rephrase": rephrase_payload,
        },
        "current_outputs": {
            "transcribe": assessment.raw_transcript,
            "label": assessment.labeled_transcript,
            "rephrase": assessment.rephrased_transcript,
        },
    }


ANSWER_STEP_ORDER = ["transcribe", "label", "rephrase"]


@router.post("/answer/{answer_id}/run", dependencies=[Depends(verify_admin)])
async def run_answer_workflow(
    answer_id: uuid.UUID,
    body: AnswerRunRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Execute the requested answer pipeline steps with optional payload overrides.
    Returns per-step outputs without writing to the database.

    `steps` controls which steps to execute (subset of ["label", "rephrase"]).
    `transcript_override` substitutes the raw_transcript for both label and rephrase.
    `overrides` provides per-step payload overrides (model, temperature, messages).
    """
    assessment, question, topic, labels = await _load_answer_context(db, answer_id)
    valid_keys = [l["key"] for l in labels]
    question_text = question.text if question else ""

    transcript = body.transcript_override or assessment.raw_transcript or ""

    results: dict[str, dict] = {}

    for step in body.steps:
        if step == "label":
            default = build_label_payload(transcript, labels)
            payload = _merge_payload(default, body.overrides.get("label"))
            results["label"] = await run_label_step(payload, valid_keys, original_text=transcript)

        elif step == "rephrase":
            default = build_rephrase_payload(question_text, transcript, labels)
            payload = _merge_payload(default, body.overrides.get("rephrase"))
            results["rephrase"] = await run_rephrase_step(payload, valid_keys)

        else:
            results[step] = {"output": None, "error": f"Unknown step: {step!r}"}

    return {"steps": results}


# ── Report workflow ───────────────────────────────────────────────────────────


@router.get("/report/{report_id}", dependencies=[Depends(verify_admin)])
async def get_report_workflow(
    report_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Return the full context, default step payloads, and current DB outputs
    for a suggestion_reports pipeline run.
    """
    report = await db.get(SuggestionReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="SuggestionReport not found")

    answer_ids = [uuid.UUID(aid) for aid in report.answer_ids]
    assessments: list[AnswerAssessment] = []
    if answer_ids:
        res = await db.scalars(
            select(AnswerAssessment).where(AnswerAssessment.id.in_(answer_ids))
        )
        by_id = {a.id: a for a in res.all()}
        assessments = [by_id[aid] for aid in answer_ids if aid in by_id]

    question_ids = [a.question_id for a in assessments if a.question_id is not None]
    questions_map: dict[str, Question] = {}
    if question_ids:
        qs = await db.scalars(select(Question).where(Question.id.in_(question_ids)))
        questions_map = {str(q.id): q for q in qs.all()}

    assessments_text = build_assessment_summary(assessments, questions_map)
    question_count = len(assessments)
    suggestions_payload = build_suggestions_payload(assessments_text, question_count)

    return {
        "report": {
            "id": str(report.id),
            "status": report.status,
            "answer_ids": report.answer_ids,
            "suggestions": _coerce_stored_suggestions(report.suggestions),
            "error_message": report.error_message,
            "created_at": report.created_at.isoformat(),
        },
        "assessments": [
            {
                "id": str(a.id),
                "status": a.status,
                "raw_transcript": a.raw_transcript,
                "labeled_transcript": a.labeled_transcript,
                "rephrased_transcript": a.rephrased_transcript,
                "question_text": questions_map[str(a.question_id)].text
                if a.question_id and str(a.question_id) in questions_map
                else None,
            }
            for a in assessments
        ],
        "default_payloads": {
            "build_summary": {"assessments_text": assessments_text},
            "generate_suggestions": suggestions_payload,
        },
        "current_outputs": {
            "build_summary": assessments_text,
            "generate_suggestions": _coerce_stored_suggestions(report.suggestions),
        },
    }


@router.post("/report/{report_id}/run", dependencies=[Depends(verify_admin)])
async def run_report_workflow(
    report_id: uuid.UUID,
    body: ReportRunRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Execute the requested report pipeline steps with optional payload overrides.
    Returns per-step outputs without writing to the database.

    `steps` controls which steps to run (subset of ["build_summary", "generate_suggestions"]).
    `summary_override` substitutes the assembled assessments text for generate_suggestions.
    `overrides` provides per-step payload overrides.
    """
    report = await db.get(SuggestionReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="SuggestionReport not found")

    results: dict[str, dict] = {}
    assembled_summary: str | None = None

    for step in body.steps:
        if step == "build_summary":
            answer_ids = [uuid.UUID(aid) for aid in report.answer_ids]
            assessments: list[AnswerAssessment] = []
            if answer_ids:
                res = await db.scalars(
                    select(AnswerAssessment).where(AnswerAssessment.id.in_(answer_ids))
                )
                by_id = {a.id: a for a in res.all()}
                assessments = [by_id[aid] for aid in answer_ids if aid in by_id]

            question_ids = [a.question_id for a in assessments if a.question_id is not None]
            questions_map: dict[str, Question] = {}
            if question_ids:
                qs = await db.scalars(select(Question).where(Question.id.in_(question_ids)))
                questions_map = {str(q.id): q for q in qs.all()}

            assembled_summary = build_assessment_summary(assessments, questions_map)
            results["build_summary"] = {"output": assembled_summary, "error": None}

        elif step == "generate_suggestions":
            summary = body.summary_override or assembled_summary
            if summary is None:
                # Fallback: rebuild summary from DB
                answer_ids = [uuid.UUID(aid) for aid in report.answer_ids]
                assessments = []
                if answer_ids:
                    res = await db.scalars(
                        select(AnswerAssessment).where(AnswerAssessment.id.in_(answer_ids))
                    )
                    by_id = {a.id: a for a in res.all()}
                    assessments = [by_id[aid] for aid in answer_ids if aid in by_id]

                question_ids = [a.question_id for a in assessments if a.question_id is not None]
                questions_map = {}
                if question_ids:
                    qs = await db.scalars(select(Question).where(Question.id.in_(question_ids)))
                    questions_map = {str(q.id): q for q in qs.all()}

                summary = build_assessment_summary(assessments, questions_map)

            default = build_suggestions_payload(summary, len(report.answer_ids))
            payload = _merge_payload(default, body.overrides.get("generate_suggestions"))
            results["generate_suggestions"] = await run_suggestions_step(
                payload, question_count=len(report.answer_ids)
            )

        else:
            results[step] = {"output": None, "error": f"Unknown step: {step!r}"}

    return {"steps": results}


# ── Default prompts (for "Reset to default" in the UI) ───────────────────────


@router.get("/defaults", dependencies=[Depends(verify_admin)])
async def get_workflow_defaults():
    """Return the current default system prompts and model settings for all steps."""
    sample_labels = [{"key": "EXAMPLE", "name": "Example label"}]
    return {
        "label": {
            "system_prompt": build_label_system_prompt(sample_labels),
            "note": "Labels depend on topic; the actual prompt includes the topic's label definitions.",
            "model": settings.LLM_MODEL,
            "temperature": 0.1,
        },
        "rephrase": {
            "system_prompt": build_rephrase_system_prompt(sample_labels),
            "note": "Labels depend on topic; the actual prompt includes the topic's label definitions.",
            "model": settings.LLM_MODEL,
            "temperature": 0.4,
        },
        "generate_suggestions": {
            "system_prompt": build_suggestions_system_prompt(3),
            "note": (
                "Each question entry must include question_snippet — a brief excerpt "
                "of the question text that links feedback back to the source question."
            ),
            "model": settings.SUGGESTIONS_LLM_MODEL,
            "temperature": 0.5,
        },
    }
