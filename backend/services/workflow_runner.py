"""
Async step execution for the admin prompt-tuning lab.

Runs individual LLM pipeline steps with caller-supplied payload overrides.
Results are NOT written back to the database — this is a read-only playground.
"""

import logging

import httpx

from core.config import settings
from services.xml_parser import build_retry_prompt, extract_xml_block, validate_xml

logger = logging.getLogger(__name__)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://aethespeech.local",
        "X-Title": "AetheSpeech",
    }


async def _call_chat(payload: dict) -> str:
    """Send a chat completion payload and return the assistant content string."""
    send = {k: v for k, v in payload.items() if k not in ("max_retries",)}
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=_headers(),
            json=send,
        )
        response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


async def run_label_step(
    payload: dict,
    valid_keys: list[str],
    original_text: str | None = None,
) -> dict:
    """
    Execute the label step with an arbitrary (possibly overridden) payload.
    Returns {"output": str, "attempts": int, "error": str | None}.
    """
    max_retries = payload.get("max_retries", settings.XML_LABEL_MAX_RETRIES)
    messages = list(payload["messages"])
    last_error = ""
    last_attempt = ""

    for attempt in range(max_retries):
        if attempt > 0:
            messages = messages + [
                {"role": "assistant", "content": last_attempt},
                {"role": "user", "content": build_retry_prompt(last_error, last_attempt)},
            ]

        try:
            content = await _call_chat({**payload, "messages": messages})
        except Exception as exc:
            return {"output": None, "attempts": attempt + 1, "error": str(exc)}

        xml_text = extract_xml_block(content)
        is_valid, error = validate_xml(
            xml_text,
            valid_keys,
            original_text=original_text,
            max_word_diff_ratio=settings.XML_WORD_COUNT_DIFF_THRESHOLD,
        )
        if is_valid:
            return {"output": xml_text, "attempts": attempt + 1, "error": None}

        last_error = error
        last_attempt = xml_text

    return {
        "output": last_attempt,
        "attempts": max_retries,
        "error": f"Invalid XML after {max_retries} attempts. Last error: {last_error}",
    }


async def run_rephrase_step(payload: dict, valid_keys: list[str]) -> dict:
    """
    Execute the rephrase step with an arbitrary (possibly overridden) payload.
    Returns {"output": str, "attempts": int, "error": str | None}.
    """
    max_retries = payload.get("max_retries", settings.XML_LABEL_MAX_RETRIES)
    messages = list(payload["messages"])
    last_error = ""
    last_attempt = ""

    for attempt in range(max_retries):
        if attempt > 0:
            messages = messages + [
                {"role": "assistant", "content": last_attempt},
                {"role": "user", "content": build_retry_prompt(last_error, last_attempt)},
            ]

        try:
            content = await _call_chat({**payload, "messages": messages})
        except Exception as exc:
            return {"output": None, "attempts": attempt + 1, "error": str(exc)}

        xml_text = extract_xml_block(content)
        # No word-count check: rephrasing intentionally changes the text length
        is_valid, error = validate_xml(xml_text, valid_keys)
        if is_valid:
            return {"output": xml_text, "attempts": attempt + 1, "error": None}

        last_error = error
        last_attempt = xml_text

    return {
        "output": last_attempt,
        "attempts": max_retries,
        "error": f"Invalid XML after {max_retries} attempts. Last error: {last_error}",
    }


async def run_suggestions_step(payload: dict) -> dict:
    """
    Execute the generate_suggestions step.
    Returns {"output": str | None, "error": str | None}.
    """
    try:
        content = await _call_chat(payload)
        return {"output": content, "error": None}
    except Exception as exc:
        return {"output": None, "error": str(exc)}
