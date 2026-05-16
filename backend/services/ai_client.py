"""
Wrapper around OpenRouter API calls.
All functions are synchronous for use inside the background worker.
"""

import base64
import logging
from pathlib import Path

import httpx

from core.config import settings
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

    with httpx.Client(timeout=120) as client:
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

def _label_system_prompt(labels: list[dict]) -> str:
    # logger.info("Label definitions received: %s", labels)
    label_defs = "\n".join(f"  <{l['key']}>…</{l['key']}> — {l['name']}" for l in labels)
    keys = [l["key"] for l in labels]
    return (
        "You are a speech structure labeler. "
        "Wrap every sentence of the user's transcript in exactly one of these XML tags:\n"
        f"{label_defs}\n\n"
        f"Allowed tags: {keys}.\n"
        "Rules:\n"
        "- Use ONLY the listed tags.\n"
        "- Every word of the original transcript must appear inside a tag.\n"
        "- Do not add, remove, or rephrase any words.\n"
        "- Output ONLY the XML — no explanations, no markdown fences."
    )


def label_transcript(
    transcript: str,
    labels: list[dict],
    max_retries: int = None,
) -> str:
    """
    Send transcript to LLM to get XML-labeled version.
    Retries up to max_retries times if the XML is invalid.
    """
    if max_retries is None:
        max_retries = settings.XML_LABEL_MAX_RETRIES

    system_prompt = _label_system_prompt(labels)
    valid_keys = [l["key"] for l in labels]

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": transcript},
    ]

    last_error = ""
    last_attempt = ""
    for attempt in range(max_retries):
        if attempt > 0:
            # Provide error feedback for retry
            retry_hint = build_retry_prompt(last_error, last_attempt)
            messages.append({"role": "user", "content": retry_hint})

        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=_headers(),
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "temperature": 0.1,
                },
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
    """
    Rephrase the transcript naturally and label it with the topic's XML tags.
    Retries up to max_retries times if the XML is invalid.
    """
    if max_retries is None:
        max_retries = settings.XML_LABEL_MAX_RETRIES

    valid_keys = [l["key"] for l in labels]
    label_defs = "\n".join(f"  <{l['key']}>…</{l['key']}> — {l['name']}" for l in labels)

    system_prompt = (
        "You are an expert business communication coach. "
        "Given a question and a spoken answer transcript, rewrite the answer in a clear, "
        "natural, professional tone while preserving the speaker's core ideas. "
        "Then wrap each sentence in the appropriate XML label tag.\n\n"
        f"Allowed tags:\n{label_defs}\n\n"
        "Output ONLY the labeled XML — no markdown, no explanation."
    )
    user_content = f"Question: {question}\n\nOriginal answer:\n{transcript}"
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

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
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "temperature": 0.4,
                },
            )
            response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"].strip()
        xml_text = extract_xml_block(content)

        # No word-count check here: rephrasing intentionally changes the text length
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
    """
    Given formatted Q&A assessments, produce actionable improvement suggestions.
    """
    system_prompt = (
        "You are an expert communication coach specialising in structured business presentations. "
        "Carefully analyse the following question-and-answer session transcript with structural labels. "
        "Identify gaps, strengths, and weak points in each answer. "
        "Provide specific, actionable suggestions to improve the speaker's communication. "
        "Structure your response with:\n"
        "1. Overall Assessment (2-3 sentences)\n"
        "2. Per-Question Feedback (brief bullet points per question)\n"
        "3. Top 3 Priority Improvements\n"
        "Be encouraging yet honest."
    )

    with httpx.Client(timeout=90) as client:
        response = client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=_headers(),
            json={
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": assessments_text},
                ],
                "temperature": 0.5,
            },
        )
        response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"].strip()
