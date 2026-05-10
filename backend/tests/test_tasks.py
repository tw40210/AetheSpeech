"""
Unit tests for Celery tasks (Flow 2 & Flow 3).
All external calls (OpenRouter, DB) are mocked.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_assessment(status="pending", has_audio=True, has_question=True):
    a = MagicMock()
    a.id = uuid.uuid4()
    a.audio_path = "/tmp/fake_audio.m4a" if has_audio else None
    a.status = status
    a.raw_transcript = None
    a.labeled_transcript = None
    a.rephrased_transcript = None
    a.error_message = None
    a.question_id = uuid.uuid4() if has_question else None
    return a


def _make_question():
    q = MagicMock()
    q.id = uuid.uuid4()
    q.text = "What is your plan?"
    q.topic_id = uuid.uuid4()
    return q


def _make_topic():
    t = MagicMock()
    t.labels = [
        {"key": "WWAD", "name": "What we are doing"},
        {"key": "WWSDI", "name": "Why we should do it"},
    ]
    return t


def _make_report(answer_ids=None):
    r = MagicMock()
    r.id = uuid.uuid4()
    r.answer_ids = [str(uuid.uuid4()) for _ in range(3)] if answer_ids is None else answer_ids
    r.status = "pending"
    r.suggestions = None
    r.error_message = None
    return r


# ── Tests: process_answer (Flow 2) ────────────────────────────────────────────

class TestProcessAnswer:
    """Tests for worker.tasks.process_answer"""

    def _run(self, assessment_id, db_mock):
        from worker.tasks import process_answer

        with patch("worker.tasks.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db_mock)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            process_answer(str(assessment_id))

    def test_happy_path(self):
        assessment = _make_assessment()
        question = _make_question()
        topic = _make_topic()

        db = MagicMock()
        db.get.side_effect = lambda model, pk: {
            "AnswerAssessment": assessment,
            "Question": question,
            "Topic": topic,
        }.get(model.__name__)

        with (
            patch("worker.tasks.transcribe_audio", return_value="Hello world"),
            patch("worker.tasks.label_transcript", return_value="<WWAD>Hello world</WWAD>"),
            patch("worker.tasks.rephrase_transcript", return_value="<WWAD>Hello world, rephrased.</WWAD>"),
            patch("worker.tasks.delete_audio"),
            patch("worker.tasks.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker import tasks
            tasks.process_answer(str(assessment.id))

        assert assessment.status == "done"
        assert assessment.raw_transcript == "Hello world"

    def test_missing_audio_path(self):
        assessment = _make_assessment(has_audio=False)
        db = MagicMock()
        db.get.return_value = assessment

        with (
            patch("worker.tasks.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker import tasks
            # Patch the self.retry on the actual task
            tasks.process_answer.retry = MagicMock(side_effect=Exception("retry"))
            try:
                tasks.process_answer(str(assessment.id))
            except Exception:
                pass

        assert assessment.status == "failed"

    def test_assessment_not_found(self):
        db = MagicMock()
        db.get.return_value = None

        with patch("worker.tasks.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker import tasks
            tasks.process_answer(str(uuid.uuid4()))  # Should not raise

    def test_no_labels_uses_unclear_fallback(self):
        assessment = _make_assessment()
        question = _make_question()
        topic = MagicMock()
        topic.labels = []  # No labels

        db = MagicMock()
        db.get.side_effect = lambda model, pk: {
            "AnswerAssessment": assessment,
            "Question": question,
            "Topic": topic,
        }.get(model.__name__)

        with (
            patch("worker.tasks.transcribe_audio", return_value="Hello"),
            patch("worker.tasks.label_transcript", return_value="<UNCLEAR>Hello</UNCLEAR>") as mock_label,
            patch("worker.tasks.rephrase_transcript", return_value="<UNCLEAR>Hello</UNCLEAR>") as mock_rephrase,
            patch("worker.tasks.delete_audio"),
            patch("worker.tasks.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker import tasks
            tasks.process_answer(str(assessment.id))

        mock_label.assert_called_once()
        mock_rephrase.assert_called_once()
        assert assessment.status == "done"


# ── Tests: generate_report (Flow 3) ──────────────────────────────────────────

class TestGenerateReport:
    def test_happy_path(self):
        from worker import tasks

        assessments = [_make_assessment(status="done") for _ in range(3)]
        for a in assessments:
            a.raw_transcript = "raw text"
            a.labeled_transcript = "<WWAD>raw text</WWAD>"
        report = _make_report(answer_ids=[str(a.id) for a in assessments])

        db = MagicMock()
        db.get.return_value = report
        db.query.return_value.filter.return_value.all.side_effect = [
            assessments,  # first query for assessment statuses
            [],           # second query for questions
        ]

        with (
            patch("worker.tasks.build_assessment_summary", return_value="summary text"),
            patch("worker.tasks.generate_suggestions", return_value="Be more concise."),
            patch("worker.tasks.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            tasks.generate_report(str(report.id))

        assert report.status == "done"
        assert report.suggestions == "Be more concise."

    def test_report_not_found(self):
        from worker import tasks

        db = MagicMock()
        db.get.return_value = None

        with patch("worker.tasks.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            tasks.generate_report(str(uuid.uuid4()))  # Should not raise


# ── Tests: xml_parser ─────────────────────────────────────────────────────────

class TestXmlParser:
    def test_valid_xml(self):
        from services.xml_parser import validate_xml

        xml = "<WWAD>We are building a new feature.</WWAD><WWHD>We shipped v1.</WWHD>"
        is_valid, error = validate_xml(xml, ["WWAD", "WWHD", "WWSDI", "NS"])
        assert is_valid
        assert error == ""

    def test_invalid_tag(self):
        from services.xml_parser import validate_xml

        xml = "<UNKNOWN>Some text.</UNKNOWN>"
        is_valid, error = validate_xml(xml, ["WWAD", "WWHD"])
        assert not is_valid
        assert "UNKNOWN" in error

    def test_malformed_xml(self):
        from services.xml_parser import validate_xml

        xml = "<WWAD>Unclosed tag"
        is_valid, error = validate_xml(xml, ["WWAD"])
        assert not is_valid
        assert "parse error" in error.lower()

    def test_extract_xml_strips_markdown_fences(self):
        from services.xml_parser import extract_xml_block

        text = "```xml\n<WWAD>text</WWAD>\n```"
        result = extract_xml_block(text)
        assert result.startswith("<WWAD>")

    def test_extract_plain_text(self):
        from services.xml_parser import extract_plain_text

        xml = "<WWAD>Hello</WWAD><WWHD>World</WWHD>"
        result = extract_plain_text(xml)
        assert "Hello" in result
        assert "World" in result

    def test_validate_xml_word_count_preserved_within_threshold(self):
        from services.xml_parser import validate_xml

        original = "We are building a feature for internal users today"
        xml = "<WWAD>We are building a feature for internal users.</WWAD>"
        is_valid, error = validate_xml(
            xml,
            ["WWAD", "WWHD"],
            original_text=original,
            max_word_diff_ratio=0.2,
        )
        assert is_valid
        assert error == ""

    def test_validate_xml_word_count_difference_exceeds_threshold(self):
        from services.xml_parser import validate_xml

        original = "We are building a feature for internal users today"
        xml = "<WWAD>We are building a feature.</WWAD>"
        is_valid, error = validate_xml(
            xml,
            ["WWAD", "WWHD"],
            original_text=original,
            max_word_diff_ratio=0.1,
        )
        assert not is_valid
        assert "Word count differs too much" in error
