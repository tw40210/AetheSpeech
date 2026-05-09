import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user
from core.database import get_db
from models.answer import AnswerAssessment
from models.report import SuggestionReport
from models.user import User
from schemas.report_schema import ReportOut, ReportRequest, ReportSummary
from schemas.answer_schema import AnswerAssessmentOut
from worker.tasks import generate_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=202)
async def submit_report(
    body: ReportRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Accept a batch of answer_ids, create a report job, and kick off Flow 3.
    """
    if not body.answer_ids:
        raise HTTPException(status_code=400, detail="answer_ids cannot be empty")

    report = SuggestionReport(
        user_id=current_user.id,
        answer_ids=[str(aid) for aid in body.answer_ids],
        status="pending",
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    await db.commit()

    generate_report.delay(str(report.id))

    return ReportOut(
        id=report.id,
        status=report.status,
        suggestions=report.suggestions,
        assessments=[],
        created_at=report.created_at,
    )


@router.get("/history", response_model=list[ReportSummary])
async def get_report_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(SuggestionReport)
        .where(SuggestionReport.user_id == current_user.id)
        .order_by(SuggestionReport.created_at.desc())
    )
    reports = result.scalars().all()
    return [
        ReportSummary(
            id=r.id,
            status=r.status,
            suggestions=r.suggestions,
            answer_count=len(r.answer_ids),
            created_at=r.created_at,
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(SuggestionReport).where(
            SuggestionReport.id == report_id,
            SuggestionReport.user_id == current_user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Fetch the associated assessments. SQL `IN (...)` does NOT preserve input
    # order, so we re-order them to match `report.answer_ids` (which captures the
    # user's actual interview question order).
    assessment_ids = [uuid.UUID(aid) for aid in report.answer_ids]
    assessments: list[AnswerAssessmentOut] = []
    if assessment_ids:
        res = await db.execute(
            select(AnswerAssessment).where(AnswerAssessment.id.in_(assessment_ids))
        )
        by_id = {a.id: a for a in res.scalars().all()}
        assessments = [
            AnswerAssessmentOut.model_validate(by_id[aid])
            for aid in assessment_ids
            if aid in by_id
        ]

    return ReportOut(
        id=report.id,
        status=report.status,
        suggestions=report.suggestions,
        assessments=assessments,
        created_at=report.created_at,
    )
