"""
Prompt builders for the AI topic generation wizard.
Mirrors the patterns in prompt_defaults.py.
"""

from core.config import settings

_PRESET_CATALOG = """\
Known preset frameworks (use is_preset: true for these):
  • WWAD / WWSDI / WWHD / NS — "What we are doing / Why we should do it / What we have done / Next step"
    Best for: business status reports, team updates, progress briefings.
  • PROBLEM / SOLUTION / VALUE / PLAN — "Problem statement / Proposed solution / Value proposition / Execution plan"
    Best for: product pitches, feature proposals, business cases.

You may also propose a custom framework when neither preset fits (use is_preset: false)."""


# ── Frameworks step ───────────────────────────────────────────


def build_frameworks_system_prompt() -> str:
    return (
        "You are an expert in structured business communication frameworks.\n"
        "Given a practice scenario, suggest 3 to 6 labeling frameworks that would help "
        "a speaker structure their answers clearly.\n\n"
        f"{_PRESET_CATALOG}\n\n"
        "Return ONLY a JSON object:\n"
        "{\n"
        '  "suggestions": [\n'
        "    {\n"
        '      "key": "WWAD",\n'
        '      "name": "What we are doing",\n'
        '      "rationale": "This scenario involves reporting on ongoing work ...",\n'
        '      "is_preset": true\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Provide 3 to 6 suggestions.\n"
        "- key: 1-20 uppercase letters or underscores (e.g. 'WWAD', 'MY_LABEL').\n"
        "- name: 1-100 characters.\n"
        "- rationale: explain specifically why this framework suits the given context.\n"
        "- Output ONLY the JSON object — no markdown fences, no extra text."
    )


def build_frameworks_payload(context: str) -> dict:
    return {
        "model": settings.LLM_MODEL,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": build_frameworks_system_prompt()},
            {"role": "user", "content": f"Practice scenario:\n{context}"},
        ],
        "response_format": {"type": "json_object"},
    }


# ── Sample question step ──────────────────────────────────────


def build_sample_question_system_prompt() -> str:
    return (
        "You are an expert practice interview designer for structured business communication.\n"
        "Given a scenario and selected framework labels, generate ONE realistic practice question.\n\n"
        "Return ONLY a JSON object:\n"
        "{\n"
        '  "text": "Describe the main initiative your team is currently working on.",\n'
        '  "context": "Focus on the project goal and the team responsible.",\n'
        '  "rationale": "Tests the speaker\'s ability to open with a clear WWAD statement."\n'
        "}\n\n"
        "Rules:\n"
        "- text: the question to ask, 10-500 characters.\n"
        "- context: optional practitioner guidance shown alongside the question (may be omitted).\n"
        "- rationale: brief explanation of why this question fits the selected framework labels.\n"
        "- Output ONLY the JSON object — no markdown fences, no extra text."
    )


def _sample_question_user_content(
    context: str,
    labels: list[dict],
    topic_name: str | None,
    topic_description: str | None,
    current_sample: dict | None,
    user_feedback: str | None,
) -> str:
    label_list = ", ".join(f"{l['key']} ({l['name']})" for l in labels)
    parts = [
        f"Practice scenario: {context}",
        f"Framework labels: {label_list}",
    ]
    if topic_name:
        parts.append(f"Topic name: {topic_name}")
    if topic_description:
        parts.append(f"Topic description: {topic_description}")
    if current_sample:
        parts.append(f"Current sample question: {current_sample['text']}")
        if current_sample.get("context"):
            parts.append(f"Current sample context: {current_sample['context']}")
    if user_feedback:
        parts.append(f"Modification request: {user_feedback}")
    return "\n".join(parts)


def build_sample_question_payload(
    context: str,
    labels: list[dict],
    topic_name: str | None = None,
    topic_description: str | None = None,
    current_sample: dict | None = None,
    user_feedback: str | None = None,
) -> dict:
    return {
        "model": settings.LLM_MODEL,
        "temperature": 0.5,
        "messages": [
            {"role": "system", "content": build_sample_question_system_prompt()},
            {
                "role": "user",
                "content": _sample_question_user_content(
                    context, labels, topic_name, topic_description, current_sample, user_feedback
                ),
            },
        ],
        "response_format": {"type": "json_object"},
    }


# ── Generate step ─────────────────────────────────────────────


def build_generate_system_prompt() -> str:
    return (
        "You are an expert practice interview designer for structured business communication.\n"
        "Generate exactly 10 varied practice questions for the given scenario and framework.\n\n"
        "Return ONLY a JSON object:\n"
        "{\n"
        '  "questions": [\n'
        '    {"text": "...", "context": "..."},\n'
        "    ...\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- The 'questions' array must contain exactly 10 items.\n"
        "- text: 10-500 characters per question.\n"
        "- context: optional practitioner guidance, 0-500 characters (may be omitted).\n"
        "- Questions must be relevant to the scenario and the selected framework labels.\n"
        "- Vary the angle, difficulty, and aspect covered across the 10 questions.\n"
        "- Use the approved sample question as a style and difficulty reference.\n"
        "- Output ONLY the JSON object — no markdown fences, no extra text."
    )


def _generate_user_content(
    context: str,
    labels: list[dict],
    topic_name: str,
    topic_description: str | None,
    approved_sample: dict,
) -> str:
    label_list = ", ".join(f"{l['key']} ({l['name']})" for l in labels)
    parts = [
        f"Topic name: {topic_name}",
        f"Practice scenario: {context}",
        f"Framework labels: {label_list}",
    ]
    if topic_description:
        parts.append(f"Topic description: {topic_description}")
    sample_line = f"Approved sample question (use as style reference): {approved_sample['text']}"
    if approved_sample.get("context"):
        sample_line += f"\n  Context hint: {approved_sample['context']}"
    parts.append(sample_line)
    return "\n".join(parts)


def build_generate_payload(
    context: str,
    labels: list[dict],
    topic_name: str,
    topic_description: str | None,
    approved_sample: dict,
) -> dict:
    return {
        "model": settings.LLM_MODEL,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": build_generate_system_prompt()},
            {
                "role": "user",
                "content": _generate_user_content(
                    context, labels, topic_name, topic_description, approved_sample
                ),
            },
        ],
        "response_format": {"type": "json_object"},
    }
