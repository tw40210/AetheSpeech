"""Tests for the topic generation service helpers (pure, no LLM calls)."""

import pytest

from schemas.topic_generation_schema import LLMGenerateTopicOutput
from schemas.topic_schema import LabelIn, QuestionIn
from services.topic_generation_service import build_topic_in


def _make_labels(n: int = 2) -> list[LabelIn]:
    return [LabelIn(key=f"L{i}", name=f"Label {i}") for i in range(n)]


def _make_llm_output() -> LLMGenerateTopicOutput:
    return LLMGenerateTopicOutput(
        questions=[QuestionIn(text=f"Question {i + 1}?", context=f"Context {i + 1}") for i in range(10)]
    )


def test_build_topic_in_preserves_name_and_description():
    result = build_topic_in(_make_llm_output(), _make_labels(), "My Topic", "A description")
    assert result.name == "My Topic"
    assert result.description == "A description"


def test_build_topic_in_none_description():
    result = build_topic_in(_make_llm_output(), _make_labels(), "My Topic", None)
    assert result.description is None


def test_build_topic_in_preserves_labels():
    labels = _make_labels(3)
    result = build_topic_in(_make_llm_output(), labels, "T", None)
    assert len(result.labels) == 3
    assert result.labels[0].key == "L0"
    assert result.labels[2].key == "L2"


def test_build_topic_in_preserves_all_ten_questions():
    result = build_topic_in(_make_llm_output(), _make_labels(), "T", None)
    assert len(result.questions) == 10
    assert result.questions[0].text == "Question 1?"
    assert result.questions[9].text == "Question 10?"


def test_build_topic_in_question_context_preserved():
    result = build_topic_in(_make_llm_output(), _make_labels(), "T", None)
    assert result.questions[4].context == "Context 5"


def test_build_topic_in_does_not_add_unclear_label():
    """UNCLEAR is added by the upload endpoint, not here — parity with manual JSON upload."""
    labels = _make_labels(2)
    result = build_topic_in(_make_llm_output(), labels, "T", None)
    keys = [l.key for l in result.labels]
    assert "UNCLEAR" not in keys
