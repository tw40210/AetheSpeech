import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user
from core.database import get_db
from models.answer import AnswerAssessment
from models.user import User
from schemas.answer_schema import AnswerSubmitResponse
from services.audio_service import save_audio
from worker.tasks import process_answer

router = APIRouter(prefix="/answers", tags=["answers"])


@router.post("", response_model=AnswerSubmitResponse, status_code=202)
async def submit_answer(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    question_id: uuid.UUID = Form(...),
    audio: UploadFile = File(...),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    assessment = AnswerAssessment(
        user_id=current_user.id,
        question_id=question_id,
        status="pending",
    )
    db.add(assessment)
    await db.flush()
    await db.refresh(assessment)

    # Persist audio to disk before committing so the worker can read it
    audio_path = await save_audio(str(assessment.id), audio_bytes)
    assessment.audio_path = audio_path

    # Commit so the worker can read the row
    await db.commit()

    # Fire-and-forget Celery task (Flow 2)
    process_answer.delay(str(assessment.id))

    return AnswerSubmitResponse(answer_id=assessment.id, status="pending")
