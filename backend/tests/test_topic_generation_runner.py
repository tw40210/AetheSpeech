"""Tests for the topic generation runner — mocks httpx, verifies retry logic."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.topic_generation_runner import (
    run_frameworks_step,
    run_generate_step,
    run_sample_question_step,
)


def _mock_response(content: str) -> MagicMock:
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json.return_value = {
        "choices": [{"message": {"content": content}}]
    }
    return mock


_VALID_FRAMEWORKS = json.dumps({
    "suggestions": [
        {"key": "WWAD", "name": "What we are doing", "rationale": "Good for status.", "is_preset": True},
    ]
})

_VALID_SAMPLE = json.dumps({
    "text": "Describe your main initiative.",
    "context": "Focus on goals.",
    "rationale": "Tests WWAD framing.",
})

_VALID_GENERATE = json.dumps({
    "questions": [
        {"text": f"Question {i + 1}?", "context": f"Context {i + 1}"}
        for i in range(10)
    ]
})


@pytest.mark.asyncio
async def test_run_frameworks_step_success():
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = _VALID_FRAMEWORKS
        result = await run_frameworks_step("I need to present a business update to my team.")

    assert result["error"] is None
    assert result["attempts"] == 1
    assert result["output"] is not None
    assert result["output"].suggestions[0].key == "WWAD"


@pytest.mark.asyncio
async def test_run_frameworks_step_retries_on_invalid_json():
    invalid = '{"suggestions": [{"key": "X"}]}'  # missing rationale/name
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.side_effect = [invalid, _VALID_FRAMEWORKS]
        result = await run_frameworks_step("context")

    assert result["error"] is None
    assert result["attempts"] == 2


@pytest.mark.asyncio
async def test_run_frameworks_step_fails_after_max_retries():
    bad = '{"suggestions": []}'
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = bad
        result = await run_frameworks_step("context")

    assert result["error"] is not None
    assert result["output"] is None
    assert result["attempts"] == 3  # default TOPIC_GENERATION_MAX_RETRIES


@pytest.mark.asyncio
async def test_run_frameworks_step_http_error():
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.side_effect = Exception("Connection refused")
        result = await run_frameworks_step("context")

    assert result["error"] == "Connection refused"
    assert result["output"] is None
    assert result["attempts"] == 1


@pytest.mark.asyncio
async def test_run_sample_question_step_success():
    labels = [{"key": "WWAD", "name": "What we are doing"}]
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = _VALID_SAMPLE
        result = await run_sample_question_step("context", labels)

    assert result["error"] is None
    assert result["output"].text == "Describe your main initiative."


@pytest.mark.asyncio
async def test_run_sample_question_step_passes_feedback():
    """User feedback is included in the payload user content."""
    labels = [{"key": "WWAD", "name": "What we are doing"}]
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = _VALID_SAMPLE
        await run_sample_question_step(
            context="context",
            labels=labels,
            current_sample={"text": "Old question", "context": None},
            user_feedback="Make it more specific",
        )
        call_payload = mock_chat.call_args[0][0]

    # Feedback should appear in the user message content
    user_message = next(m for m in call_payload["messages"] if m["role"] == "user")
    assert "Make it more specific" in user_message["content"]
    assert "Old question" in user_message["content"]


@pytest.mark.asyncio
async def test_run_generate_step_success():
    labels = [{"key": "WWAD", "name": "What we are doing"}]
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = _VALID_GENERATE
        result = await run_generate_step(
            context="context",
            labels=labels,
            topic_name="Business Report",
            topic_description=None,
            approved_sample={"text": "Sample Q?", "context": None},
        )

    assert result["error"] is None
    assert len(result["output"].questions) == 10


@pytest.mark.asyncio
async def test_run_generate_step_retries_on_wrong_question_count():
    nine_questions = json.dumps({
        "questions": [{"text": f"Q {i}?"} for i in range(9)]
    })
    labels = [{"key": "WWAD", "name": "What we are doing"}]
    with patch("services.topic_generation_runner._call_chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.side_effect = [nine_questions, _VALID_GENERATE]
        result = await run_generate_step("ctx", labels, "T", None, {"text": "S?"})

    assert result["error"] is None
    assert result["attempts"] == 2
