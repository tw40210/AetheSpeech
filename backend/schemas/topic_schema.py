import uuid
from pydantic import BaseModel


class LabelOut(BaseModel):
    key: str
    name: str


class TopicOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    labels: list[LabelOut]

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    text: str
    context: str | None

    model_config = {"from_attributes": True}
