"""Tests for POST /reports, GET /reports/{id}, and GET /reports/history."""

import uuid

import pytest

from models.answer import AnswerAssessment
from models.report import SuggestionReport
from models.topic import Question, Topic
from models.user import User


async def _seed_user_and_assessments(db_session, email="rep@example.com", count=3):
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = User(
        id=uuid.uuid4(),
        email=email,
        hashed_password=pwd_context.hash("password"),
    )
    db_session.add(user)

    topic = Topic(
        id=uuid.uuid4(),
        name="Report Topic",
        description="desc",
        labels=[{"key": "WWAD", "name": "What we are doing"}],
    )
    db_session.add(topic)

    assessments = []
    for i in range(count):
        q = Question(id=uuid.uuid4(), topic_id=topic.id, text=f"Q{i}")
        db_session.add(q)
        a = AnswerAssessment(
            id=uuid.uuid4(),
            user_id=user.id,
            question_id=q.id,
            status="done",
            raw_transcript=f"Raw transcript {i}",
            labeled_transcript=f"<WWAD>Labeled {i}</WWAD>",
            rephrased_transcript=f"<WWAD>Rephrased {i}</WWAD>",
        )
        db_session.add(a)
        assessments.append(a)

    await db_session.commit()
    return user, assessments


@pytest.mark.asyncio
async def test_submit_report_success(client, auth_headers, db_session, mocker):
    mocker.patch("api.reports.generate_report.delay")

    _, assessments = await _seed_user_and_assessments(db_session)
    answer_ids = [str(a.id) for a in assessments]

    resp = await client.post(
        "/reports",
        json={"answer_ids": answer_ids},
        headers=auth_headers,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_submit_report_empty_ids(client, auth_headers, mocker):
    mocker.patch("api.reports.generate_report.delay")

    resp = await client.post(
        "/reports",
        json={"answer_ids": []},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_report_pending(client, auth_headers, db_session, mocker):
    mocker.patch("api.reports.generate_report.delay")

    _, assessments = await _seed_user_and_assessments(db_session)
    answer_ids = [str(a.id) for a in assessments]

    post_resp = await client.post(
        "/reports",
        json={"answer_ids": answer_ids},
        headers=auth_headers,
    )
    report_id = post_resp.json()["id"]

    get_resp = await client.get(f"/reports/{report_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == report_id
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_report_done(client, auth_headers, db_session, mocker):
    mocker.patch("api.reports.generate_report.delay")

    _, assessments = await _seed_user_and_assessments(db_session)
    answer_ids = [str(a.id) for a in assessments]

    post_resp = await client.post(
        "/reports",
        json={"answer_ids": answer_ids},
        headers=auth_headers,
    )
    report_id = post_resp.json()["id"]

    # Manually mark as done in DB
    from sqlalchemy import select
    from core.database import AsyncSession

    # Use the same overridden DB session via a new request
    result = await db_session.execute(
        __import__("sqlalchemy", fromlist=["select"]).select(SuggestionReport).where(
            SuggestionReport.id == uuid.UUID(report_id)
        )
    )
    report = result.scalar_one()
    report.status = "done"
    report.suggestions = "Great job! Improve X and Y."
    await db_session.commit()

    get_resp = await client.get(f"/reports/{report_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["status"] == "done"
    assert data["suggestions"] == "Great job! Improve X and Y."
    # Assessments should be included
    assert len(data["assessments"]) == 3


@pytest.mark.asyncio
async def test_get_report_not_found(client, auth_headers):
    resp = await client.get(f"/reports/{uuid.uuid4()}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_report_history_empty(client, auth_headers):
    resp = await client.get("/reports/history", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_report_history_returns_user_reports(client, auth_headers, db_session, mocker):
    mocker.patch("api.reports.generate_report.delay")

    _, assessments = await _seed_user_and_assessments(db_session)
    answer_ids = [str(a.id) for a in assessments]

    # Submit 2 reports
    for _ in range(2):
        await client.post(
            "/reports",
            json={"answer_ids": answer_ids},
            headers=auth_headers,
        )

    resp = await client.get("/reports/history", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_reports_require_auth(client):
    resp = await client.post("/reports", json={"answer_ids": []})
    assert resp.status_code == 403

    resp = await client.get("/reports/history")
    assert resp.status_code == 403
