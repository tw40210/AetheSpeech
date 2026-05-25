"""
Unit tests for background jobs (Flow 2 & Flow 3).
All external calls (OpenRouter, DB) are mocked.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from models.answer import AnswerAssessment
from models.topic import Question, Topic


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
    r.status = "processing"
    r.suggestions = None
    r.error_message = None
    return r


class TestProcessAnswer:
    def test_happy_path(self):
        assessment = _make_assessment(status="processing")
        question = _make_question()
        topic = _make_topic()

        db = MagicMock()
        db.get.side_effect = lambda model, pk: {
            AnswerAssessment: assessment,
            Question: question,
            Topic: topic,
        }.get(model)

        with (
            patch("worker.jobs.transcribe_audio", return_value="Hello world"),
            patch("worker.jobs.label_transcript", return_value="<WWAD>Hello world</WWAD>"),
            patch(
                "worker.jobs.rephrase_transcript",
                return_value="<WWAD>Hello world, rephrased.</WWAD>",
            ),
            patch("worker.jobs.delete_audio"),
            patch("worker.jobs.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker.jobs import run_process_answer

            run_process_answer(str(assessment.id))

        assert assessment.status == "done"
        assert assessment.raw_transcript == "Hello world"

    def test_missing_audio_path(self):
        assessment = _make_assessment(status="processing", has_audio=False)
        db = MagicMock()
        db.get.return_value = assessment

        with patch("worker.jobs.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker.jobs import run_process_answer

            run_process_answer(str(assessment.id))

        assert assessment.status == "failed"

    def test_assessment_not_found(self):
        db = MagicMock()
        db.get.return_value = None

        with patch("worker.jobs.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker.jobs import run_process_answer

            run_process_answer(str(uuid.uuid4()))

    def test_no_labels_uses_unclear_fallback(self):
        assessment = _make_assessment(status="processing")
        question = _make_question()
        topic = MagicMock()
        topic.labels = []

        db = MagicMock()
        db.get.side_effect = lambda model, pk: {
            AnswerAssessment: assessment,
            Question: question,
            Topic: topic,
        }.get(model)

        with (
            patch("worker.jobs.transcribe_audio", return_value="Hello"),
            patch("worker.jobs.label_transcript", return_value="<UNCLEAR>Hello</UNCLEAR>") as mock_label,
            patch("worker.jobs.rephrase_transcript", return_value="<UNCLEAR>Hello</UNCLEAR>") as mock_rephrase,
            patch("worker.jobs.delete_audio"),
            patch("worker.jobs.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            from worker.jobs import run_process_answer

            run_process_answer(str(assessment.id))

        mock_label.assert_called_once()
        mock_rephrase.assert_called_once()
        assert assessment.status == "done"


class TestGenerateReport:
    def test_happy_path(self):
        from worker import jobs

        assessments = [_make_assessment(status="done") for _ in range(3)]
        for a in assessments:
            a.raw_transcript = "raw text"
            a.labeled_transcript = "<WWAD>raw text</WWAD>"
        report = _make_report(answer_ids=[str(a.id) for a in assessments])

        db = MagicMock()
        db.get.return_value = report
        db.query.return_value.filter.return_value.all.side_effect = [
            assessments,
            [],
        ]

        sample_suggestions = {
            "questions": [
                {
                    "question_index": 1,
                    "question_snippet": "What motivates you at work",
                    "positive_points": ["Good pace"],
                    "need_improvement_points": ["Be more concise"],
                    "scores": {"structure": 3, "native": 4, "wording": 3},
                }
            ]
        }

        with (
            patch("worker.jobs.build_assessment_summary", return_value="summary text"),
            patch("worker.jobs.generate_suggestions", return_value=sample_suggestions),
            patch("worker.jobs.get_sync_db") as mock_ctx,
        ):
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            jobs.run_generate_report(str(report.id))

        assert report.status == "done"
        assert report.suggestions == sample_suggestions

    def test_report_not_found(self):
        from worker import jobs

        db = MagicMock()
        db.get.return_value = None

        with patch("worker.jobs.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            jobs.run_generate_report(str(uuid.uuid4()))

    def test_fails_when_assessments_not_ready(self):
        from worker import jobs

        assessments = [_make_assessment(status="done")]
        report = _make_report(
            answer_ids=[str(a.id) for a in assessments] + [str(uuid.uuid4())]
        )

        db = MagicMock()
        db.get.return_value = report
        db.query.return_value.filter.return_value.all.return_value = assessments

        with patch("worker.jobs.get_sync_db") as mock_ctx:
            mock_ctx.return_value.__enter__ = MagicMock(return_value=db)
            mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
            jobs.run_generate_report(str(report.id))

        assert report.status == "failed"


class TestAssessmentsReady:
    def test_empty_not_ready(self):
        from worker.jobs import assessments_ready

        assert not assessments_ready([], 3)

    def test_partial_not_ready(self):
        from worker.jobs import assessments_ready

        assert not assessments_ready([_make_assessment(status="done")], 3)

    def test_pending_not_ready(self):
        from worker.jobs import assessments_ready

        items = [_make_assessment(status="done"), _make_assessment(status="pending")]
        assert not assessments_ready(items, 2)

    def test_all_terminal_ready(self):
        from worker.jobs import assessments_ready

        items = [_make_assessment(status="done"), _make_assessment(status="failed")]
        assert assessments_ready(items, 2)
