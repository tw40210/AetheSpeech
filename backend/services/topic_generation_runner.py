"""
Async OpenRouter calls for the topic generation wizard.
Each function returns {"output": <parsed model | None>, "attempts": int, "error": str | None}.
Mirrors the patterns in workflow_runner.py.
"""

import logging

import httpx

from core.config import settings
from services.topic_generation_parser import (
    build_topic_generation_retry_prompt,
    validate_frameworks,
    validate_generate_topic,
    validate_sample_question,
)
from services.topic_generation_prompts import (
    build_frameworks_payload,
    build_generate_payload,
    build_sample_question_payload,
)

logger = logging.getLogger(__name__)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://aethespeech.local",
        "X-Title": "AetheSpeech",
    }


async def _call_chat(payload: dict) -> str:
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


async def run_frameworks_step(context: str) -> dict:
    payload = build_frameworks_payload(context)
    messages = list(payload["messages"])
    max_retries = settings.TOPIC_GENERATION_MAX_RETRIES
    last_error = ""
    last_attempt = ""

    for attempt in range(max_retries):
        if attempt > 0:
            messages = messages + [
                {"role": "assistant", "content": last_attempt},
                {"role": "user", "content": build_topic_generation_retry_prompt(last_error, last_attempt)},
            ]
        try:
            content = await _call_chat({**payload, "messages": messages})
        except Exception as exc:
            return {"output": None, "attempts": attempt + 1, "error": str(exc)}

        is_valid, error, parsed = validate_frameworks(content)
        if is_valid and parsed is not None:
            return {"output": parsed, "attempts": attempt + 1, "error": None}

        last_error = error
        last_attempt = content

    return {
        "output": None,
        "attempts": max_retries,
        "error": f"Invalid frameworks JSON after {max_retries} attempts. Last error: {last_error}",
    }


async def run_sample_question_step(
    context: str,
    labels: list[dict],
    topic_name: str | None = None,
    topic_description: str | None = None,
    current_sample: dict | None = None,
    user_feedback: str | None = None,
) -> dict:
    payload = build_sample_question_payload(
        context, labels, topic_name, topic_description, current_sample, user_feedback
    )
    messages = list(payload["messages"])
    max_retries = settings.TOPIC_GENERATION_MAX_RETRIES
    last_error = ""
    last_attempt = ""

    for attempt in range(max_retries):
        if attempt > 0:
            messages = messages + [
                {"role": "assistant", "content": last_attempt},
                {"role": "user", "content": build_topic_generation_retry_prompt(last_error, last_attempt)},
            ]
        try:
            content = await _call_chat({**payload, "messages": messages})
        except Exception as exc:
            return {"output": None, "attempts": attempt + 1, "error": str(exc)}

        is_valid, error, parsed = validate_sample_question(content)
        if is_valid and parsed is not None:
            return {"output": parsed, "attempts": attempt + 1, "error": None}

        last_error = error
        last_attempt = content

    return {
        "output": None,
        "attempts": max_retries,
        "error": f"Invalid sample question JSON after {max_retries} attempts. Last error: {last_error}",
    }


async def run_generate_step(
    context: str,
    labels: list[dict],
    topic_name: str,
    topic_description: str | None,
    approved_sample: dict,
) -> dict:
    payload = build_generate_payload(
        context, labels, topic_name, topic_description, approved_sample
    )
    messages = list(payload["messages"])
    max_retries = settings.TOPIC_GENERATION_MAX_RETRIES
    last_error = ""
    last_attempt = ""

    for attempt in range(max_retries):
        if attempt > 0:
            messages = messages + [
                {"role": "assistant", "content": last_attempt},
                {"role": "user", "content": build_topic_generation_retry_prompt(last_error, last_attempt)},
            ]
        try:
            content = await _call_chat({**payload, "messages": messages})
        except Exception as exc:
            return {"output": None, "attempts": attempt + 1, "error": str(exc)}

        is_valid, error, parsed = validate_generate_topic(content)
        if is_valid and parsed is not None:
            return {"output": parsed, "attempts": attempt + 1, "error": None}

        last_error = error
        last_attempt = content

    return {
        "output": None,
        "attempts": max_retries,
        "error": f"Invalid generate topic JSON after {max_retries} attempts. Last error: {last_error}",
    }
