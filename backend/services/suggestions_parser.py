"""
Parse and validate LLM-produced structured report feedback JSON.
"""

import json
import re

from pydantic import ValidationError

from schemas.suggestions_schema import StructuredSuggestions


def extract_json_block(text: str) -> str:
    """Strip markdown fences and isolate the JSON object."""
    text = re.sub(r"```(?:json)?", "", text).strip()
    start = text.find("{")
    if start == -1:
        return text
    return text[start:]


def validate_suggestions(
    raw_text: str,
    expected_question_count: int | None = None,
) -> tuple[bool, str, StructuredSuggestions | None]:
    """
    Returns (is_valid, error_message, parsed_model).
    """
    json_text = extract_json_block(raw_text)

    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as exc:
        return False, f"JSON parse error: {exc}", None

    questions = data.get("questions")
    if isinstance(questions, list):
        for q in questions:
            if isinstance(q, dict) and not q.get("question_snippet"):
                return (
                    False,
                    "Schema validation error: question_snippet is required for each question",
                    None,
                )

    try:
        parsed = StructuredSuggestions.model_validate(data)
    except ValidationError as exc:
        return False, f"Schema validation error: {exc}", None

    if expected_question_count is not None:
        if len(parsed.questions) != expected_question_count:
            return (
                False,
                (
                    f"Expected {expected_question_count} question entries, "
                    f"got {len(parsed.questions)}"
                ),
                None,
            )

        indices = sorted(q.question_index for q in parsed.questions)
        expected_indices = list(range(1, expected_question_count + 1))
        if indices != expected_indices:
            return (
                False,
                (
                    f"question_index values must be {expected_indices}, "
                    f"got {indices}"
                ),
                None,
            )

    return True, "", parsed


def build_suggestions_retry_prompt(error: str, attempted: str) -> str:
    return (
        f"Your previous JSON output was invalid:\n{error}\n\n"
        f"Previous attempt:\n{attempted}\n\n"
        "Fix the JSON and return ONLY a valid JSON object matching the required schema. "
        "Do not include markdown fences or any text outside the JSON."
    )
