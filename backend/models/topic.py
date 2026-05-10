import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from core.topic_labels import ensure_default_unclear_label
from models.user import GUID


class Topic(Base):
    """
    labels: [{"key": "WWAD", "name": "What we are doing"}, ...]
    """

    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    labels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    questions: Mapped[list["Question"]] = relationship(
        back_populates="topic", lazy="select", cascade="all, delete-orphan"
    )


@event.listens_for(Topic, "before_insert")
def _topic_ensure_default_unclear_label(mapper, connection, target: "Topic") -> None:
    target.labels = ensure_default_unclear_label(target.labels)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(), primary_key=True, default=uuid.uuid4
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=True)

    topic: Mapped["Topic"] = relationship(back_populates="questions")
