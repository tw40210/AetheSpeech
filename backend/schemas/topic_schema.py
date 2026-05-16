import uuid
from pydantic import BaseModel, Field


# ── Output schemas ────────────────────────────────────────────

class LabelOut(BaseModel):
    key: str
    name: str


class TopicOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    labels: list[LabelOut]
    is_own: bool = False

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    text: str
    context: str | None

    model_config = {"from_attributes": True}


# ── Upload / input schemas (with field-length validation) ─────

class LabelIn(BaseModel):
    key: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)


class QuestionIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    context: str | None = Field(default=None, max_length=500)


class TopicIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    labels: list[LabelIn] = Field(..., min_length=1, max_length=20)
    questions: list[QuestionIn] = Field(..., min_length=1, max_length=50)
