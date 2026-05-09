import uuid
from datetime import datetime
from pydantic import BaseModel
from schemas.answer_schema import AnswerAssessmentOut


class ReportRequest(BaseModel):
    answer_ids: list[uuid.UUID]


class ReportOut(BaseModel):
    id: uuid.UUID
    status: str
    suggestions: str | None
    assessments: list[AnswerAssessmentOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportSummary(BaseModel):
    id: uuid.UUID
    status: str
    suggestions: str | None
    answer_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
