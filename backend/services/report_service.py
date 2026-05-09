"""
Helpers for assembling the text payload that is sent to the LLM for
suggestion generation (Flow 3).
"""

from models.answer import AnswerAssessment
from models.topic import Question


def build_assessment_summary(
    assessments: list[AnswerAssessment],
    questions: dict[str, Question],
) -> str:
    """
    Format all Q&A pairs into a single string for the LLM.
    """
    parts: list[str] = []
    for i, assessment in enumerate(assessments, 1):
        q_text = "Unknown question"
        if assessment.question_id and str(assessment.question_id) in questions:
            q_text = questions[str(assessment.question_id)].text

        raw = assessment.raw_transcript or "(no transcript)"
        labeled = assessment.labeled_transcript or "(no labeled transcript)"

        parts.append(
            f"--- Question {i} ---\n"
            f"Q: {q_text}\n\n"
            f"Raw Answer:\n{raw}\n\n"
            f"Labeled Answer:\n{labeled}\n"
        )
    return "\n".join(parts)
