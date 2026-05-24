"""
Generic read-only database browser for the admin dashboard.

Supports all five application tables with pagination and basic filters.
The hashed_password column is masked to avoid exposing sensitive data.
"""

import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin.dependencies import verify_admin
from core.database import get_db
from models.answer import AnswerAssessment
from models.report import SuggestionReport
from models.topic import Question, Topic
from models.user import User

router = APIRouter(prefix="/db", tags=["admin-db"])

# Ordered so the sidebar renders in a logical sequence
TABLE_REGISTRY: dict[str, type] = {
    "users": User,
    "topics": Topic,
    "questions": Question,
    "answer_assessments": AnswerAssessment,
    "suggestion_reports": SuggestionReport,
}

MASKED_COLUMNS: set[str] = {"hashed_password"}

# Tables without a created_at column use a different sort column
SORT_COLUMNS: dict[str, str] = {
    "questions": "topic_id",
}


def _serialize_value(v: Any) -> Any:
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def _serialize_row(row: Any) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for col in row.__table__.columns:
        if col.name in MASKED_COLUMNS:
            result[col.name] = "***"
        else:
            result[col.name] = _serialize_value(getattr(row, col.name))
    return result


def _column_names(model: type) -> list[str]:
    return [col.name for col in model.__table__.columns]


@router.get("/tables", dependencies=[Depends(verify_admin)])
async def list_tables(db: Annotated[AsyncSession, Depends(get_db)]):
    """Return all monitored tables with their current row counts."""
    results = []
    for name, model in TABLE_REGISTRY.items():
        count = await db.scalar(select(func.count()).select_from(model))
        results.append({"name": name, "count": count or 0})
    return results


@router.get("/tables/{table_name}", dependencies=[Depends(verify_admin)])
async def get_table_rows(
    table_name: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(0, ge=0),
    page_size: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
    user_id: str | None = Query(None),
):
    """
    Return paginated rows for a table with optional status/user_id filters.
    Always sorted by created_at desc (or topic_id for questions).
    """
    if table_name not in TABLE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unknown table: {table_name!r}")

    model = TABLE_REGISTRY[table_name]
    stmt = select(model)

    if status is not None and hasattr(model, "status"):
        stmt = stmt.where(model.status == status)

    if user_id is not None and hasattr(model, "user_id"):
        try:
            uid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="user_id must be a valid UUID")
        stmt = stmt.where(model.user_id == uid)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))

    sort_attr = getattr(model, SORT_COLUMNS.get(table_name, "created_at"), None)
    if sort_attr is not None:
        stmt = stmt.order_by(sort_attr.desc())

    rows_result = await db.scalars(stmt.offset(page * page_size).limit(page_size))
    rows = [_serialize_row(r) for r in rows_result.all()]

    return {
        "table": table_name,
        "columns": _column_names(model),
        "masked_columns": list(MASKED_COLUMNS & set(_column_names(model))),
        "rows": rows,
        "total": total or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/tables/{table_name}/{row_id}", dependencies=[Depends(verify_admin)])
async def get_table_row(
    table_name: str,
    row_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return a single row by its UUID primary key."""
    if table_name not in TABLE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Unknown table: {table_name!r}")

    model = TABLE_REGISTRY[table_name]
    try:
        pk = uuid.UUID(row_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="row_id must be a valid UUID")

    row = await db.get(model, pk)
    if row is None:
        raise HTTPException(status_code=404, detail="Row not found")

    return _serialize_row(row)
