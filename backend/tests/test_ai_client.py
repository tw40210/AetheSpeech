from unittest.mock import MagicMock, patch

import pytest

from services.ai_client import rephrase_transcript


def _mock_response(content: str):
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {
        "choices": [{"message": {"content": content}}],
    }
    return response


def _labels():
    return [
        {"key": "WWAD", "name": "What we are doing"},
        {"key": "WWSDI", "name": "Why we should do it"},
    ]


def test_rephrase_transcript_retries_then_succeeds():
    with patch("services.ai_client.httpx.Client") as mock_client:
        mock_http = MagicMock()
        mock_http.post.side_effect = [
            _mock_response("<BAD>Wrong tag</BAD>"),
            _mock_response("<WWAD>Valid answer.</WWAD>"),
        ]
        mock_client.return_value.__enter__.return_value = mock_http
        mock_client.return_value.__exit__.return_value = False

        result = rephrase_transcript(
            question="What is your plan?",
            transcript="My plan is to execute quickly.",
            labels=_labels(),
            max_retries=2,
        )

    assert result == "<WWAD>Valid answer.</WWAD>"
    assert mock_http.post.call_count == 2


def test_rephrase_transcript_raises_after_max_retries():
    with patch("services.ai_client.httpx.Client") as mock_client:
        mock_http = MagicMock()
        mock_http.post.side_effect = [
            _mock_response("<BAD>Wrong tag</BAD>"),
            _mock_response("<ALSO_BAD>Still wrong</ALSO_BAD>"),
        ]
        mock_client.return_value.__enter__.return_value = mock_http
        mock_client.return_value.__exit__.return_value = False

        with pytest.raises(ValueError, match="invalid rephrased XML"):
            rephrase_transcript(
                question="What is your plan?",
                transcript="My plan is to execute quickly.",
                labels=_labels(),
                max_retries=2,
            )

