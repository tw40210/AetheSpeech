from pydantic import BaseModel, Field


class QuestionScores(BaseModel):
    structure: int = Field(ge=1, le=5, description="Structure clarity score (1-5)")
    native: int = Field(ge=1, le=5, description="Natural fluency score (1-5)")
    wording: int = Field(ge=1, le=5, description="Word choice score (1-5)")


class QuestionFeedback(BaseModel):
    question_index: int = Field(ge=1, description="1-based index matching question order")
    question_snippet: str = Field(
        min_length=1,
        description="Short excerpt of the question text for display and traceability",
    )
    positive_points: list[str] = Field(min_length=1)
    need_improvement_points: list[str] = Field(min_length=1)
    scores: QuestionScores


class StructuredSuggestions(BaseModel):
    questions: list[QuestionFeedback] = Field(min_length=1)


def normalize_stored_suggestions(value: dict) -> dict:
    """Backfill fields missing from suggestions stored before schema changes."""
    questions = value.get("questions")
    if not isinstance(questions, list):
        return value

    normalized_questions: list = []
    for q in questions:
        if not isinstance(q, dict):
            normalized_questions.append(q)
            continue
        q_copy = dict(q)
        if not q_copy.get("question_snippet"):
            index = q_copy.get("question_index", "?")
            q_copy["question_snippet"] = f"Question {index}"
        normalized_questions.append(q_copy)

    return {**value, "questions": normalized_questions}
