"""
Helpers for assembling the text payload that is sent to the LLM for
suggestion generation (Flow 3).
"""

import re
import uuid

from models.answer import AnswerAssessment
from models.topic import Question


def order_assessments(
    assessments: list[AnswerAssessment],
    answer_ids: list[uuid.UUID],
) -> list[AnswerAssessment]:
    """Return assessments in the same order as answer_ids."""
    by_id = {a.id: a for a in assessments}
    return [by_id[aid] for aid in answer_ids if aid in by_id]


def _question_text(assessment: AnswerAssessment, questions: dict[str, Question]) -> str:
    if assessment.question_id and str(assessment.question_id) in questions:
        return questions[str(assessment.question_id)].text
    return "Unknown question"


def build_single_assessment_text(
    assessment: AnswerAssessment,
    questions: dict[str, Question],
    *,
    question_index: int | None = None,
) -> str:
    """Format one Q&A pair for the LLM."""
    q_text = _question_text(assessment, questions)
    raw = assessment.raw_transcript or "(no transcript)"
    labeled = assessment.labeled_transcript or "(no labeled transcript)"

    header = f"--- Question {question_index} ---\n" if question_index is not None else ""
    return (
        f"{header}"
        f"Q: {q_text}\n\n"
        f"Raw Answer:\n{raw}\n\n"
        f"Labeled Answer:\n{labeled}\n"
    )


def build_assessment_texts(
    assessments: list[AnswerAssessment],
    questions: dict[str, Question],
) -> list[str]:
    """Format each Q&A pair as a separate string for per-question LLM calls."""
    return [
        build_single_assessment_text(assessment, questions, question_index=i)
        for i, assessment in enumerate(assessments, 1)
    ]


def build_assessment_summary(
    assessments: list[AnswerAssessment],
    questions: dict[str, Question],
) -> str:
    """Format all Q&A pairs into a single string (for admin display)."""
    return "\n".join(build_assessment_texts(assessments, questions))


def split_assessment_summary(summary: str) -> list[str]:
    """Split a combined summary back into per-question texts."""
    summary = summary.strip()
    if not summary:
        return []
    parts = re.split(r"(?=--- Question \d+ ---\n)", summary)
    return [part.strip() for part in parts if part.strip()]
