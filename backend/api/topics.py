import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user
from core.config import settings
from core.database import get_db
from core.topic_labels import ensure_default_unclear_label
from models.topic import Topic, Question
from models.user import User
from schemas.topic_schema import TopicIn, TopicOut

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[TopicOut])
async def fetch_topics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Topic)
        .where((Topic.user_id == None) | (Topic.user_id == current_user.id))  # noqa: E711
        .order_by(Topic.user_id.is_(None).desc(), Topic.name)
    )
    topics = result.scalars().all()
    out = []
    for t in topics:
        out.append(
            TopicOut(
                id=t.id,
                name=t.name,
                description=t.description,
                labels=t.labels or [],
                is_own=t.user_id is not None,
            )
        )
    return out


@router.post("/upload", response_model=list[TopicOut], status_code=201)
async def upload_topics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    if file.content_type not in ("application/json", "text/plain", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="File must be a JSON file.")

    raw = await file.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc}") from exc

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="JSON must be a list of topic objects.")

    topics_in: list[TopicIn] = []
    for i, item in enumerate(data):
        try:
            topics_in.append(TopicIn.model_validate(item))
        except Exception as exc:
            raise HTTPException(
                status_code=422, detail=f"Topic at index {i} is invalid: {exc}"
            ) from exc

    # Count existing user topics against the quota
    count_result = await db.execute(
        select(func.count()).where(Topic.user_id == current_user.id)
    )
    existing_count: int = count_result.scalar_one()

    if existing_count + len(topics_in) > settings.MAX_USER_TOPICS:
        remaining = settings.MAX_USER_TOPICS - existing_count
        raise HTTPException(
            status_code=400,
            detail=(
                f"You have {existing_count} custom topic(s) already. "
                f"You can upload at most {remaining} more "
                f"(limit: {settings.MAX_USER_TOPICS})."
            ),
        )

    created: list[TopicOut] = []
    for topic_in in topics_in:
        labels = ensure_default_unclear_label(
            [{"key": l.key, "name": l.name} for l in topic_in.labels]
        )
        topic = Topic(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=topic_in.name,
            description=topic_in.description,
            labels=labels,
        )
        db.add(topic)
        await db.flush()

        for q_in in topic_in.questions:
            db.add(
                Question(
                    id=uuid.uuid4(),
                    topic_id=topic.id,
                    text=q_in.text,
                    context=q_in.context,
                )
            )

        created.append(
            TopicOut(
                id=topic.id,
                name=topic.name,
                description=topic.description,
                labels=topic.labels or [],
                is_own=True,
            )
        )

    await db.commit()
    return created


@router.delete("/{topic_id}", status_code=204)
async def delete_topic(
    topic_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == current_user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found or not yours.")
    await db.execute(delete(Topic).where(Topic.id == topic_id))
    await db.commit()
