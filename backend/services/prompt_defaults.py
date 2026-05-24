"""
Canonical prompt builders shared by the background worker (via ai_client.py)
and the admin workflow runner (via workflow_runner.py).

Each build_*_payload function returns a dict that can be sent directly to
OpenRouter's /chat/completions endpoint, or returned to the admin UI as the
default payload for a step.
"""

from core.config import settings


# ── Label step ────────────────────────────────────────────────────────────────


def build_label_system_prompt(labels: list[dict]) -> str:
    label_defs = "\n".join(
        f"  <{l['key']}>…</{l['key']}> — {l['name']}" for l in labels
    )
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


def build_label_payload(transcript: str, labels: list[dict]) -> dict:
    return {
        "model": settings.LLM_MODEL,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": build_label_system_prompt(labels)},
            {"role": "user", "content": transcript},
        ],
    }


# ── Rephrase step ─────────────────────────────────────────────────────────────


def build_rephrase_system_prompt(labels: list[dict]) -> str:
    label_defs = "\n".join(
        f"  <{l['key']}>…</{l['key']}> — {l['name']}" for l in labels
    )
    return (
        "You are an expert business communication coach. "
        "Given a question and a spoken answer transcript, rewrite the answer in a clear, "
        "natural, professional tone while preserving the speaker's core ideas. "
        "Then wrap each sentence in the appropriate XML label tag.\n\n"
        f"Allowed tags:\n{label_defs}\n\n"
        "Output ONLY the labeled XML — no markdown, no explanation."
    )


def build_rephrase_payload(question: str, transcript: str, labels: list[dict]) -> dict:
    user_content = f"Question: {question}\n\nOriginal answer:\n{transcript}"
    return {
        "model": settings.LLM_MODEL,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": build_rephrase_system_prompt(labels)},
            {"role": "user", "content": user_content},
        ],
    }


# ── Suggestions step ──────────────────────────────────────────────────────────


def build_suggestions_system_prompt() -> str:
    return (
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


def build_suggestions_payload(assessments_text: str) -> dict:
    return {
        "model": settings.LLM_MODEL,
        "temperature": 0.5,
        "messages": [
            {"role": "system", "content": build_suggestions_system_prompt()},
            {"role": "user", "content": assessments_text},
        ],
    }
