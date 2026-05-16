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

    user_id is NULL for system-seeded (public) topics; set for user-uploaded topics.

    Existing-DB migration (run once if upgrading from a version without user_id):
        ALTER TABLE topics ADD COLUMN user_id CHAR(36) REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX ix_topics_user_id ON topics (user_id);
        ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_name_key;
    """

    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
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
