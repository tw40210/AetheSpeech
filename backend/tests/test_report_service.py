import uuid
from unittest.mock import MagicMock

from services.report_service import (
    build_assessment_summary,
    build_assessment_texts,
    order_assessments,
    split_assessment_summary,
)


def _make_assessment(question_text_id=None):
    a = MagicMock()
    a.id = uuid.uuid4()
    a.question_id = question_text_id or uuid.uuid4()
    a.raw_transcript = "raw answer"
    a.labeled_transcript = "<TAG>raw answer</TAG>"
    return a


def _make_question(qid, text):
    q = MagicMock()
    q.id = qid
    q.text = text
    return q


def test_order_assessments_preserves_answer_id_order():
    ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
    assessments = [_make_assessment() for _ in ids]
    for assessment, aid in zip(assessments, ids):
        assessment.id = aid

    shuffled = [assessments[2], assessments[0], assessments[1]]
    ordered = order_assessments(shuffled, ids)

    assert [a.id for a in ordered] == ids


def test_build_assessment_texts_and_summary_match():
    qid = uuid.uuid4()
    assessment = _make_assessment(qid)
    questions = {str(qid): _make_question(qid, "What is your plan?")}

    texts = build_assessment_texts([assessment], questions)
    summary = build_assessment_summary([assessment], questions)

    assert len(texts) == 1
    assert "--- Question 1 ---" in texts[0]
    assert "What is your plan?" in texts[0]
    assert summary == texts[0]


def test_split_assessment_summary_round_trip():
    qid1 = uuid.uuid4()
    qid2 = uuid.uuid4()
    assessments = [_make_assessment(qid1), _make_assessment(qid2)]
    questions = {
        str(qid1): _make_question(qid1, "Question one"),
        str(qid2): _make_question(qid2, "Question two"),
    }

    summary = build_assessment_summary(assessments, questions)
    parts = split_assessment_summary(summary)

    assert len(parts) == 2
    assert "Question one" in parts[0]
    assert "Question two" in parts[1]
