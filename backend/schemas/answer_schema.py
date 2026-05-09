import uuid
from datetime import datetime
from pydantic import BaseModel


class AnswerSubmitResponse(BaseModel):
    answer_id: uuid.UUID
    status: str


class AnswerAssessmentOut(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID | None
    raw_transcript: str | None
    labeled_transcript: str | None
    rephrased_transcript: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
