import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from models.user import GUID


class AnswerAssessment(Base):
    __tablename__ = "answer_assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True
    )
    audio_path: Mapped[str] = mapped_column(String(500), nullable=True)

    raw_transcript: Mapped[str] = mapped_column(Text, nullable=True)
    labeled_transcript: Mapped[str] = mapped_column(Text, nullable=True)
    rephrased_transcript: Mapped[str] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="assessments")  # type: ignore[name-defined]
    question: Mapped["Question"] = relationship()  # type: ignore[name-defined]
