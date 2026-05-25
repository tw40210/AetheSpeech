import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from schemas.answer_schema import AnswerAssessmentOut
from schemas.suggestions_schema import StructuredSuggestions, normalize_stored_suggestions


class ReportRequest(BaseModel):
    answer_ids: list[uuid.UUID]


class ReportOut(BaseModel):
    id: uuid.UUID
    status: str
    suggestions: StructuredSuggestions | None = None
    assessments: list[AnswerAssessmentOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("suggestions", mode="before")
    @classmethod
    def coerce_suggestions(cls, value):
        if value is None or isinstance(value, StructuredSuggestions):
            return value
        if isinstance(value, dict):
            return StructuredSuggestions.model_validate(normalize_stored_suggestions(value))
        return None


class ReportSummary(BaseModel):
    id: uuid.UUID
    status: str
    suggestions: StructuredSuggestions | None = None
    answer_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("suggestions", mode="before")
    @classmethod
    def coerce_suggestions(cls, value):
        if value is None or isinstance(value, StructuredSuggestions):
            return value
        if isinstance(value, dict):
            return StructuredSuggestions.model_validate(normalize_stored_suggestions(value))
        return None
