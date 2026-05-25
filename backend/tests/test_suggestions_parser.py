"""Tests for suggestions JSON parsing and validation."""

import pytest

from services.suggestions_parser import validate_suggestions


VALID_JSON = """
{
  "questions": [
    {
      "question_index": 1,
      "positive_points": ["Clear structure", "Good examples"],
      "need_improvement_points": ["Slow pacing", "Weak closing"],
      "scores": {"structure": 4, "native": 3, "wording": 5}
    },
    {
      "question_index": 2,
      "positive_points": ["Confident delivery"],
      "need_improvement_points": ["Needs clearer transitions"],
      "scores": {"structure": 3, "native": 4, "wording": 3}
    }
  ]
}
"""


def test_validate_suggestions_success():
    ok, error, parsed = validate_suggestions(VALID_JSON, expected_question_count=2)
    assert ok
    assert error == ""
    assert parsed is not None
    assert len(parsed.questions) == 2


def test_validate_suggestions_rejects_invalid_json():
    ok, error, parsed = validate_suggestions("not json", expected_question_count=1)
    assert not ok
    assert "JSON parse error" in error
    assert parsed is None


def test_validate_suggestions_rejects_wrong_question_count():
    ok, error, parsed = validate_suggestions(VALID_JSON, expected_question_count=3)
    assert not ok
    assert "Expected 3 question entries" in error
    assert parsed is None


def test_validate_suggestions_rejects_bad_indices():
    bad = VALID_JSON.replace('"question_index": 2', '"question_index": 9')
    ok, error, parsed = validate_suggestions(bad, expected_question_count=2)
    assert not ok
    assert "question_index values must be" in error
    assert parsed is None
