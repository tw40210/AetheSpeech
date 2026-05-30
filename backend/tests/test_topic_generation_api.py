"""
API integration tests for the topic generation wizard endpoints.
Patches runner functions — no real OpenRouter calls.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from schemas.topic_generation_schema import (
    LLMFrameworkSuggestion,
    LLMFrameworksOutput,
    LLMSampleQuestionOutput,
    LLMGenerateTopicOutput,
)
from schemas.topic_schema import QuestionIn


_LABELS = [{"key": "WWAD", "name": "What we are doing"}]

_VALID_FRAMEWORKS_OUTPUT = LLMFrameworksOutput(
    suggestions=[
        LLMFrameworkSuggestion(
            key="WWAD", name="What we are doing", rationale="Good for updates.", is_preset=True
        )
    ]
)

_VALID_SAMPLE_OUTPUT = LLMSampleQuestionOutput(
    text="Describe your initiative.",
    context="Focus on goals.",
    rationale="Tests WWAD.",
)

_VALID_GENERATE_OUTPUT = LLMGenerateTopicOutput(
    questions=[QuestionIn(text=f"Q {i + 1}?", context=f"C {i + 1}") for i in range(10)]
)


# ── Auth requirements ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_frameworks_requires_auth(client):
    resp = await client.post("/topic-generator/frameworks", json={"context": "x" * 25})
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_sample_question_requires_auth(client):
    resp = await client.post(
        "/topic-generator/sample-question",
        json={"context": "x" * 25, "labels": _LABELS},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_generate_requires_auth(client):
    resp = await client.post(
        "/topic-generator/generate",
        json={
            "context": "x" * 25,
            "labels": _LABELS,
            "topic_name": "T",
            "approved_sample": {"text": "Q?"},
        },
    )
    assert resp.status_code in (401, 403)


# ── Input validation ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_frameworks_rejects_short_context(client, auth_headers):
    resp = await client.post(
        "/topic-generator/frameworks",
        json={"context": "too short"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_sample_question_rejects_empty_labels(client, auth_headers):
    resp = await client.post(
        "/topic-generator/sample-question",
        json={"context": "x" * 25, "labels": []},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_generate_rejects_short_context(client, auth_headers):
    resp = await client.post(
        "/topic-generator/generate",
        json={
            "context": "short",
            "labels": _LABELS,
            "topic_name": "T",
            "approved_sample": {"text": "Q?"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


# ── Success paths ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_frameworks_returns_suggestions(client, auth_headers):
    with patch(
        "api.topic_generation.run_frameworks_step",
        new_callable=AsyncMock,
        return_value={"output": _VALID_FRAMEWORKS_OUTPUT, "attempts": 1, "error": None},
    ):
        resp = await client.post(
            "/topic-generator/frameworks",
            json={"context": "I need to present a business update to my team."},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert "suggestions" in data
    assert data["suggestions"][0]["key"] == "WWAD"
    assert data["suggestions"][0]["rationale"] != ""
    assert "is_preset" in data["suggestions"][0]


@pytest.mark.asyncio
async def test_sample_question_returns_question(client, auth_headers):
    with patch(
        "api.topic_generation.run_sample_question_step",
        new_callable=AsyncMock,
        return_value={"output": _VALID_SAMPLE_OUTPUT, "attempts": 1, "error": None},
    ):
        resp = await client.post(
            "/topic-generator/sample-question",
            json={"context": "x" * 25, "labels": _LABELS},
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["text"] == "Describe your initiative."
    assert data["rationale"] == "Tests WWAD."


@pytest.mark.asyncio
async def test_sample_question_passes_feedback_to_runner(client, auth_headers):
    with patch(
        "api.topic_generation.run_sample_question_step",
        new_callable=AsyncMock,
        return_value={"output": _VALID_SAMPLE_OUTPUT, "attempts": 1, "error": None},
    ) as mock_runner:
        await client.post(
            "/topic-generator/sample-question",
            json={
                "context": "x" * 25,
                "labels": _LABELS,
                "current_sample": {"text": "Old Q?"},
                "user_feedback": "Make it harder",
            },
            headers=auth_headers,
        )

    call_kwargs = mock_runner.call_args.kwargs
    assert call_kwargs["user_feedback"] == "Make it harder"
    assert call_kwargs["current_sample"]["text"] == "Old Q?"


@pytest.mark.asyncio
async def test_generate_returns_topic_in_shape(client, auth_headers):
    with patch(
        "api.topic_generation.run_generate_step",
        new_callable=AsyncMock,
        return_value={"output": _VALID_GENERATE_OUTPUT, "attempts": 1, "error": None},
    ):
        resp = await client.post(
            "/topic-generator/generate",
            json={
                "context": "x" * 25,
                "labels": _LABELS,
                "topic_name": "Business Update",
                "approved_sample": {"text": "Describe your initiative."},
            },
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Business Update"
    assert len(data["questions"]) == 10
    assert "labels" in data
    assert data["labels"][0]["key"] == "WWAD"


# ── Error handling ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_frameworks_runner_error_returns_502(client, auth_headers):
    with patch(
        "api.topic_generation.run_frameworks_step",
        new_callable=AsyncMock,
        return_value={"output": None, "attempts": 3, "error": "LLM unreachable"},
    ):
        resp = await client.post(
            "/topic-generator/frameworks",
            json={"context": "x" * 25},
            headers=auth_headers,
        )
    assert resp.status_code == 502
    assert "LLM unreachable" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_generate_runner_error_returns_502(client, auth_headers):
    with patch(
        "api.topic_generation.run_generate_step",
        new_callable=AsyncMock,
        return_value={"output": None, "attempts": 3, "error": "Invalid JSON after 3 attempts"},
    ):
        resp = await client.post(
            "/topic-generator/generate",
            json={
                "context": "x" * 25,
                "labels": _LABELS,
                "topic_name": "T",
                "approved_sample": {"text": "Q?"},
            },
            headers=auth_headers,
        )
    assert resp.status_code == 502


# ── Upload compatibility ──────────────────────────────────────

@pytest.mark.asyncio
async def test_generated_topic_is_upload_compatible(client, auth_headers):
    """
    A topic returned by /generate can be passed directly to /topics/upload
    wrapped in a JSON array — no transformation needed.
    """
    with patch(
        "api.topic_generation.run_generate_step",
        new_callable=AsyncMock,
        return_value={"output": _VALID_GENERATE_OUTPUT, "attempts": 1, "error": None},
    ):
        gen_resp = await client.post(
            "/topic-generator/generate",
            json={
                "context": "x" * 25,
                "labels": _LABELS,
                "topic_name": "Compat Topic",
                "approved_sample": {"text": "Q?"},
            },
            headers=auth_headers,
        )

    assert gen_resp.status_code == 200
    topic_data = gen_resp.json()

    # Wrap in array and upload via multipart (mimics the frontend download-then-upload flow)
    json_bytes = json.dumps([topic_data]).encode()
    upload_resp = await client.post(
        "/topics/upload",
        files={"file": ("topic.json", json_bytes, "application/json")},
        headers=auth_headers,
    )
    assert upload_resp.status_code == 201
    uploaded = upload_resp.json()
    assert len(uploaded) == 1
    assert uploaded[0]["name"] == "Compat Topic"
