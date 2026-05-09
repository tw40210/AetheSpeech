"""Tests for POST /answers endpoint (audio submission)."""

import io
import uuid

import pytest

from models.answer import AnswerAssessment
from models.topic import Question, Topic


async def _seed_question(db_session) -> Question:
    topic = Topic(
        id=uuid.uuid4(),
        name="Test Topic",
        description="desc",
        labels=[{"key": "WWAD", "name": "What we are doing"}],
    )
    db_session.add(topic)
    q = Question(id=uuid.uuid4(), topic_id=topic.id, text="What is your plan?")
    db_session.add(q)
    await db_session.commit()
    return q


@pytest.mark.asyncio
async def test_submit_answer_success(client, auth_headers, db_session, mocker):
    mocker.patch("api.answers.save_audio", return_value="/tmp/fake.m4a")
    mocker.patch("api.answers.process_answer.delay")

    question = await _seed_question(db_session)
    audio_content = b"fake-audio-bytes"

    resp = await client.post(
        "/answers",
        headers=auth_headers,
        data={"question_id": str(question.id)},
        files={"audio": ("answer.m4a", io.BytesIO(audio_content), "audio/m4a")},
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "answer_id" in data
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_submit_answer_empty_audio(client, auth_headers, db_session, mocker):
    mocker.patch("api.answers.save_audio", return_value="/tmp/fake.m4a")
    mocker.patch("api.answers.process_answer.delay")

    question = await _seed_question(db_session)

    resp = await client.post(
        "/answers",
        headers=auth_headers,
        data={"question_id": str(question.id)},
        files={"audio": ("empty.m4a", io.BytesIO(b""), "audio/m4a")},
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_submit_answer_requires_auth(client, db_session):
    resp = await client.post(
        "/answers",
        data={"question_id": str(uuid.uuid4())},
        files={"audio": ("a.m4a", io.BytesIO(b"data"), "audio/m4a")},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_submit_answer_triggers_celery(client, auth_headers, db_session, mocker):
    mock_save = mocker.patch("api.answers.save_audio", return_value="/tmp/test.m4a")
    mock_delay = mocker.patch("api.answers.process_answer.delay")

    question = await _seed_question(db_session)

    await client.post(
        "/answers",
        headers=auth_headers,
        data={"question_id": str(question.id)},
        files={"audio": ("a.m4a", io.BytesIO(b"audio"), "audio/m4a")},
    )

    mock_save.assert_called_once()
    mock_delay.assert_called_once()


@pytest.mark.asyncio
async def test_submit_answer_missing_question_id(client, auth_headers):
    resp = await client.post(
        "/answers",
        headers=auth_headers,
        files={"audio": ("a.m4a", io.BytesIO(b"data"), "audio/m4a")},
    )
    assert resp.status_code == 422
