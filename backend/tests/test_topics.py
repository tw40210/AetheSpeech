"""Tests for /topics and /questions endpoints."""

import json
import uuid
from pathlib import Path

import pytest

from models.topic import Question, Topic


async def _seed_topic(db_session, name="Business Report"):
    topic = Topic(
        id=uuid.uuid4(),
        name=name,
        description="Test topic",
        labels=[
            {"key": "WWAD", "name": "What we are doing"},
            {"key": "WWHD", "name": "What we have done"},
        ],
    )
    db_session.add(topic)
    for i in range(5):
        db_session.add(
            Question(
                id=uuid.uuid4(),
                topic_id=topic.id,
                text=f"Question {i + 1}",
                context=f"Context {i + 1}",
            )
        )
    await db_session.commit()
    return topic


@pytest.mark.asyncio
async def test_download_sample_topics(client):
    resp = await client.get("/topics/sample")
    assert resp.status_code == 200
    assert "application/json" in resp.headers["content-type"]
    assert "sample_seed.json" in resp.headers.get("content-disposition", "")
    data = resp.json()
    on_disk = json.loads(
        (Path(__file__).resolve().parent.parent / "sample_seed.json").read_text(encoding="utf-8")
    )
    assert data == on_disk


@pytest.mark.asyncio
async def test_fetch_topics_empty(client, auth_headers):
    resp = await client.get("/topics", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_fetch_topics_returns_seeded(client, auth_headers, db_session):
    topic = await _seed_topic(db_session)
    resp = await client.get("/topics", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == topic.name
    assert len(data[0]["labels"]) == 3  # seeded WWAD + WWHD + default UNCLEAR
    assert any(l["key"] == "UNCLEAR" for l in data[0]["labels"])


@pytest.mark.asyncio
async def test_fetch_topics_multiple(client, auth_headers, db_session):
    await _seed_topic(db_session, "Topic A")
    await _seed_topic(db_session, "Topic B")
    resp = await client.get("/topics", headers=auth_headers)
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_fetch_questions_returns_random_subset(client, auth_headers, db_session):
    topic = await _seed_topic(db_session)
    resp = await client.get(
        "/questions",
        params={"topic_id": str(topic.id), "amount": 3},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    for q in data:
        assert q["topic_id"] == str(topic.id)


@pytest.mark.asyncio
async def test_fetch_questions_default_amount(client, auth_headers, db_session):
    topic = await _seed_topic(db_session)
    resp = await client.get(
        "/questions",
        params={"topic_id": str(topic.id)},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # Only 5 seeded, default is 10 — so returns all 5
    assert len(resp.json()) == 5


@pytest.mark.asyncio
async def test_fetch_questions_missing_topic_id(client, auth_headers):
    resp = await client.get("/questions", headers=auth_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_fetch_questions_unknown_topic(client, auth_headers):
    resp = await client.get(
        "/questions",
        params={"topic_id": str(uuid.uuid4())},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_topics_require_auth(client):
    resp = await client.get("/topics")
    assert resp.status_code == 403

    resp = await client.get("/questions", params={"topic_id": str(uuid.uuid4())})
    assert resp.status_code == 403
