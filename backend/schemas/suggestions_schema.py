from pydantic import BaseModel, Field


class QuestionScores(BaseModel):
    structure: int = Field(ge=1, le=5, description="Structure clarity score (1-5)")
    native: int = Field(ge=1, le=5, description="Natural fluency score (1-5)")
    wording: int = Field(ge=1, le=5, description="Word choice score (1-5)")


class QuestionFeedback(BaseModel):
    question_index: int = Field(ge=1, description="1-based index matching question order")
    positive_points: list[str] = Field(min_length=1)
    need_improvement_points: list[str] = Field(min_length=1)
    scores: QuestionScores


class StructuredSuggestions(BaseModel):
    questions: list[QuestionFeedback] = Field(min_length=1)
