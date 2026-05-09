import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user
from core.config import settings
from core.database import get_db
from models.topic import Question
from models.user import User
from schemas.topic_schema import QuestionOut

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("", response_model=list[QuestionOut])
async def fetch_questions(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    topic_id: uuid.UUID = Query(...),
    amount: int = Query(default=None),
):
    if amount is None:
        amount = settings.QUESTIONS_PER_SESSION

    result = await db.execute(
        select(Question)
        .where(Question.topic_id == topic_id)
        .order_by(func.random())
        .limit(amount)
    )
    return result.scalars().all()
