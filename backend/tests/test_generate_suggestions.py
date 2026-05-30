"""Tests for per-question suggestion generation and merge."""

from unittest.mock import MagicMock, patch

import pytest

from services.ai_client import generate_suggestions


def _single_feedback(index: int = 1) -> dict:
    return {
        "question_index": index,
        "question_snippet": f"Snippet {index}",
        "positive_points": ["Good pace"],
        "need_improvement_points": ["Be more concise"],
        "scores": {"structure": 3, "native": 4, "wording": 3},
    }


def test_generate_suggestions_merges_per_question_in_order():
    side_effect = [_single_feedback(99), _single_feedback(99)]

    with patch(
        "services.ai_client._generate_single_suggestion",
        side_effect=side_effect,
    ) as mock_single:
        result = generate_suggestions(["question one text", "question two text"])

    assert mock_single.call_count == 2
    assert mock_single.call_args_list[0].args[0] == "question one text"
    assert mock_single.call_args_list[1].args[0] == "question two text"
    assert [q["question_index"] for q in result["questions"]] == [1, 2]
    assert result["questions"][0]["question_snippet"] == "Snippet 99"
    assert result["questions"][1]["question_snippet"] == "Snippet 99"


def test_generate_suggestions_rejects_empty_input():
    with pytest.raises(ValueError, match="cannot be empty"):
        generate_suggestions([])


def test_generate_single_suggestion_validates_one_question():
    from services.ai_client import _generate_single_suggestion

    valid = """
    {
      "questions": [
        {
          "question_index": 1,
          "question_snippet": "What motivates you",
          "positive_points": ["Clear structure"],
          "need_improvement_points": ["Slow pacing"],
          "scores": {"structure": 4, "native": 3, "wording": 5}
        }
      ]
    }
    """

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": valid}}],
    }

    with patch("services.ai_client.httpx.Client") as mock_client:
        mock_http = MagicMock()
        mock_http.post.return_value = mock_response
        mock_client.return_value.__enter__.return_value = mock_http
        mock_client.return_value.__exit__.return_value = False

        result = _generate_single_suggestion("assessment text")

    assert result["question_index"] == 1
    assert result["question_snippet"] == "What motivates you"
