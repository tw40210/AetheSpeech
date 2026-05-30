"""
Request/response schemas for the AI topic generation wizard.
Also contains internal LLM output models used by the parser.
"""

from pydantic import BaseModel, Field

from schemas.topic_schema import LabelIn, QuestionIn


# ── Internal LLM output models (validated by parser) ─────────


class LLMFrameworkSuggestion(BaseModel):
    key: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    rationale: str = Field(..., min_length=1)
    is_preset: bool = False


class LLMFrameworksOutput(BaseModel):
    suggestions: list[LLMFrameworkSuggestion] = Field(..., min_length=1, max_length=10)


class LLMSampleQuestionOutput(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    context: str | None = Field(default=None, max_length=500)
    rationale: str = Field(..., min_length=1)


class LLMGenerateTopicOutput(BaseModel):
    """Exactly 10 questions as produced by the generate step."""

    questions: list[QuestionIn] = Field(..., min_length=10, max_length=10)


# ── API request models ────────────────────────────────────────


class FrameworkSuggestRequest(BaseModel):
    context: str = Field(..., min_length=20, max_length=2000)


class SampleQuestionRequest(BaseModel):
    context: str = Field(..., min_length=20, max_length=2000)
    labels: list[LabelIn] = Field(..., min_length=1, max_length=20)
    topic_name: str | None = Field(default=None, max_length=100)
    topic_description: str | None = Field(default=None, max_length=500)
    current_sample: QuestionIn | None = None
    user_feedback: str | None = Field(default=None, max_length=1000)


class GenerateTopicRequest(BaseModel):
    context: str = Field(..., min_length=20, max_length=2000)
    labels: list[LabelIn] = Field(..., min_length=1, max_length=20)
    topic_name: str = Field(..., min_length=1, max_length=100)
    topic_description: str | None = Field(default=None, max_length=500)
    approved_sample: QuestionIn


# ── API response models ───────────────────────────────────────


class FrameworkSuggestion(BaseModel):
    key: str
    name: str
    rationale: str
    is_preset: bool


class FrameworkSuggestResponse(BaseModel):
    suggestions: list[FrameworkSuggestion]


class SampleQuestionResponse(BaseModel):
    text: str
    context: str | None = None
    rationale: str
