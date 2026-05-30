"""Tests for the topic generation parser — validates LLM output contracts."""

import json

import pytest

from services.topic_generation_parser import (
    build_topic_generation_retry_prompt,
    validate_frameworks,
    validate_generate_topic,
    validate_sample_question,
)


# ── validate_frameworks ───────────────────────────────────────

def test_validate_frameworks_valid():
    raw = json.dumps({
        "suggestions": [
            {"key": "WWAD", "name": "What we are doing", "rationale": "Fits reports.", "is_preset": True},
            {"key": "NS", "name": "Next step", "rationale": "Good for roadmaps.", "is_preset": True},
        ]
    })
    is_valid, error, parsed = validate_frameworks(raw)
    assert is_valid
    assert error == ""
    assert parsed is not None
    assert len(parsed.suggestions) == 2
    assert parsed.suggestions[0].key == "WWAD"
    assert parsed.suggestions[0].is_preset is True


def test_validate_frameworks_strips_markdown_fences():
    raw = "```json\n" + json.dumps({
        "suggestions": [
            {"key": "PROBLEM", "name": "Problem statement", "rationale": "Pitch context.", "is_preset": True}
        ]
    }) + "\n```"
    is_valid, _, parsed = validate_frameworks(raw)
    assert is_valid
    assert parsed is not None
    assert parsed.suggestions[0].key == "PROBLEM"


def test_validate_frameworks_missing_rationale():
    raw = json.dumps({
        "suggestions": [
            {"key": "WWAD", "name": "What we are doing"}
        ]
    })
    is_valid, error, parsed = validate_frameworks(raw)
    assert not is_valid
    assert "rationale" in error.lower() or "validation" in error.lower()
    assert parsed is None


def test_validate_frameworks_invalid_json():
    is_valid, error, parsed = validate_frameworks("not json at all")
    assert not is_valid
    assert "JSON parse error" in error
    assert parsed is None


def test_validate_frameworks_empty_suggestions():
    raw = json.dumps({"suggestions": []})
    is_valid, error, parsed = validate_frameworks(raw)
    assert not is_valid
    assert parsed is None


# ── validate_sample_question ──────────────────────────────────

def test_validate_sample_question_valid():
    raw = json.dumps({
        "text": "Describe the main initiative your team is working on.",
        "context": "Focus on the project goal.",
        "rationale": "Tests the speaker's WWAD framing.",
    })
    is_valid, error, parsed = validate_sample_question(raw)
    assert is_valid
    assert error == ""
    assert parsed is not None
    assert parsed.text.startswith("Describe")
    assert parsed.rationale != ""


def test_validate_sample_question_no_context_is_valid():
    raw = json.dumps({
        "text": "What problem does your product solve?",
        "rationale": "Opens with PROBLEM framing.",
    })
    is_valid, _, parsed = validate_sample_question(raw)
    assert is_valid
    assert parsed is not None
    assert parsed.context is None


def test_validate_sample_question_missing_rationale():
    raw = json.dumps({"text": "What is the status?"})
    is_valid, error, parsed = validate_sample_question(raw)
    assert not is_valid
    assert "rationale" in error.lower() or "validation" in error.lower()
    assert parsed is None


def test_validate_sample_question_strips_fences():
    raw = "```json\n" + json.dumps({
        "text": "What motivates you?",
        "rationale": "Personal framing.",
    }) + "\n```"
    is_valid, _, parsed = validate_sample_question(raw)
    assert is_valid
    assert parsed is not None


# ── validate_generate_topic ───────────────────────────────────

def _make_ten_questions():
    return [{"text": f"Question {i + 1}?", "context": f"Context {i + 1}"} for i in range(10)]


def test_validate_generate_topic_valid():
    raw = json.dumps({"questions": _make_ten_questions()})
    is_valid, error, parsed = validate_generate_topic(raw)
    assert is_valid
    assert error == ""
    assert parsed is not None
    assert len(parsed.questions) == 10


def test_validate_generate_topic_wrong_count_9():
    raw = json.dumps({"questions": _make_ten_questions()[:9]})
    is_valid, error, parsed = validate_generate_topic(raw)
    assert not is_valid
    assert "9" in error or "10" in error
    assert parsed is None


def test_validate_generate_topic_wrong_count_11():
    raw = json.dumps({"questions": _make_ten_questions() + [{"text": "Extra?"}]})
    is_valid, error, parsed = validate_generate_topic(raw)
    assert not is_valid
    assert "11" in error or "10" in error
    assert parsed is None


def test_validate_generate_topic_strips_fences():
    raw = "```json\n" + json.dumps({"questions": _make_ten_questions()}) + "\n```"
    is_valid, _, parsed = validate_generate_topic(raw)
    assert is_valid
    assert parsed is not None


def test_validate_generate_topic_invalid_json():
    is_valid, error, parsed = validate_generate_topic("{bad}")
    assert not is_valid
    assert "JSON parse error" in error
    assert parsed is None


def test_validate_generate_topic_question_text_too_long():
    questions = _make_ten_questions()
    questions[0]["text"] = "x" * 501
    raw = json.dumps({"questions": questions})
    is_valid, error, parsed = validate_generate_topic(raw)
    assert not is_valid
    assert parsed is None


# ── build_topic_generation_retry_prompt ──────────────────────

def test_retry_prompt_includes_error_and_attempt():
    prompt = build_topic_generation_retry_prompt("bad schema", "previous json")
    assert "bad schema" in prompt
    assert "previous json" in prompt
    assert "Fix" in prompt or "fix" in prompt
