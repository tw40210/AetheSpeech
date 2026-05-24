"""
Wrapper around OpenRouter API calls.
All functions are synchronous for use inside the background worker.
"""

import base64
import logging
from pathlib import Path

import httpx

from core.config import settings
from services.prompt_defaults import (
    build_label_payload,
    build_rephrase_payload,
    build_suggestions_payload,
)
from services.xml_parser import (
    build_retry_prompt,
    extract_xml_block,
    validate_xml,
)

logger = logging.getLogger(__name__)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://aethespeech.local",
        "X-Title": "AetheSpeech",
    }


# ── Transcription ─────────────────────────────────────────────────────────────

def transcribe_audio(audio_path: str) -> str:
    """Call Audio LLM via OpenRouter and return the transcript text."""
    path = Path(audio_path)
    with path.open("rb") as f:
        audio_bytes = f.read()

    audio_format = path.suffix.lower().lstrip(".") or "m4a"
    encoded_audio = base64.b64encode(audio_bytes).decode("ascii")

    with httpx.Client(timeout=300) as client:
        response = client.post(
            f"{settings.OPENROUTER_BASE_URL}/audio/transcriptions",
            headers=_headers(),
            json={
                "model": settings.WHISPER_MODEL,
                "input_audio": {
                    "data": encoded_audio,
                    "format": audio_format,
                },
            },
        )
        if response.is_error:
            raise httpx.HTTPStatusError(
                (
                    f"OpenRouter transcription failed ({response.status_code}): "
                    f"{response.text}"
                ),
                request=response.request,
                response=response,
            )
        response.raise_for_status()

    data = response.json()
    return data.get("text", "").strip()


# ── XML Labeling ──────────────────────────────────────────────────────────────


def label_transcript(
    transcript: str,
    labels: list[dict],
    max_retries: int = None,
) -> str:
    """Send transcript to LLM to get XML-labeled version. Retries on invalid XML."""
    if max_retries is None:
        max_retries = settings.XML_LABEL_MAX_RETRIES

    payload = build_label_payload(transcript, labels)
    valid_keys = [l["key"] for l in labels]
    messages = list(payload["messages"])

    last_error = ""
    last_attempt = ""
    for attempt in range(max_retries):
        if attempt > 0:
            retry_hint = build_retry_prompt(last_error, last_attempt)
            messages.append({"role": "user", "content": retry_hint})

        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=_headers(),
                json={**payload, "messages": messages},
            )
            response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"].strip()
        xml_text = extract_xml_block(content)

        is_valid, error = validate_xml(
            xml_text,
            valid_keys,
            original_text=transcript,
            max_word_diff_ratio=settings.XML_WORD_COUNT_DIFF_THRESHOLD,
        )
        if is_valid:
            return xml_text

        last_error = error
        last_attempt = xml_text
        messages.append({"role": "assistant", "content": content})

    raise ValueError(
        f"LLM produced invalid XML after {max_retries} attempts. "
        f"Last error: {last_error}"
    )


# ── Rephrasing ────────────────────────────────────────────────────────────────


def rephrase_transcript(
    question: str,
    transcript: str,
    labels: list[dict],
    max_retries: int = None,
) -> str:
    """Rephrase transcript and label it with topic XML tags. Retries on invalid XML."""
    if max_retries is None:
        max_retries = settings.XML_LABEL_MAX_RETRIES

    payload = build_rephrase_payload(question, transcript, labels)
    valid_keys = [l["key"] for l in labels]
    messages = list(payload["messages"])

    last_error = ""
    last_attempt = ""
    for attempt in range(max_retries):
        if attempt > 0:
            retry_hint = build_retry_prompt(last_error, last_attempt)
            messages.append({"role": "user", "content": retry_hint})

        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=_headers(),
                json={**payload, "messages": messages},
            )
            response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"].strip()
        xml_text = extract_xml_block(content)

        # No word-count check: rephrasing intentionally changes the text length
        is_valid, error = validate_xml(xml_text, valid_keys)
        if is_valid:
            return xml_text

        last_error = error
        last_attempt = xml_text
        messages.append({"role": "assistant", "content": content})

    raise ValueError(
        f"LLM produced invalid rephrased XML after {max_retries} attempts. "
        f"Last error: {last_error}"
    )


# ── Report Suggestions ────────────────────────────────────────────────────────


def generate_suggestions(assessments_text: str) -> str:
    """Given formatted Q&A assessments, produce actionable improvement suggestions."""
    payload = build_suggestions_payload(assessments_text)

    with httpx.Client(timeout=90) as client:
        response = client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"].strip()
