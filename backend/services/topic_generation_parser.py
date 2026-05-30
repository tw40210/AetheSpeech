"""
Parse and validate LLM output for the topic generation wizard.
Mirrors the patterns in suggestions_parser.py.
"""

import json
import re

from pydantic import ValidationError

from schemas.topic_generation_schema import (
    LLMFrameworksOutput,
    LLMGenerateTopicOutput,
    LLMSampleQuestionOutput,
)


def _extract_json_block(text: str) -> str:
    """Strip markdown fences and isolate the first JSON object."""
    text = re.sub(r"```(?:json)?", "", text).strip()
    start = text.find("{")
    if start == -1:
        return text
    return text[start:]


def validate_frameworks(
    raw_text: str,
) -> tuple[bool, str, LLMFrameworksOutput | None]:
    json_text = _extract_json_block(raw_text)
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as exc:
        return False, f"JSON parse error: {exc}", None
    try:
        parsed = LLMFrameworksOutput.model_validate(data)
    except ValidationError as exc:
        return False, f"Schema validation error: {exc}", None
    return True, "", parsed


def validate_sample_question(
    raw_text: str,
) -> tuple[bool, str, LLMSampleQuestionOutput | None]:
    json_text = _extract_json_block(raw_text)
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as exc:
        return False, f"JSON parse error: {exc}", None
    try:
        parsed = LLMSampleQuestionOutput.model_validate(data)
    except ValidationError as exc:
        return False, f"Schema validation error: {exc}", None
    return True, "", parsed


def validate_generate_topic(
    raw_text: str,
) -> tuple[bool, str, LLMGenerateTopicOutput | None]:
    json_text = _extract_json_block(raw_text)
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as exc:
        return False, f"JSON parse error: {exc}", None

    # Pydantic enforces min_length=10/max_length=10, but check early for a better error message.
    if isinstance(data.get("questions"), list) and len(data["questions"]) != 10:
        return (
            False,
            f"Expected exactly 10 questions, got {len(data['questions'])}",
            None,
        )

    try:
        parsed = LLMGenerateTopicOutput.model_validate(data)
    except ValidationError as exc:
        return False, f"Schema validation error: {exc}", None
    return True, "", parsed


def build_topic_generation_retry_prompt(error: str, attempted: str) -> str:
    return (
        f"Your previous JSON output was invalid:\n{error}\n\n"
        f"Previous attempt:\n{attempted}\n\n"
        "Fix the JSON and return ONLY a valid JSON object matching the required schema. "
        "Do not include markdown fences or any text outside the JSON."
    )
