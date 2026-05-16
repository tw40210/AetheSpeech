"""
Poll Postgres for pending answer assessments and reports, then run jobs.

Start with: python -m worker
"""

import logging
import time
import uuid

from sqlalchemy import select

from core.config import settings
from models.report import SuggestionReport
from worker.db import get_sync_db
from worker.jobs import (
    assessments_ready,
    claim_next_answer,
    fetch_assessments,
    report_wait_timed_out,
    run_generate_report,
    run_process_answer,
    try_claim_report,
)

logger = logging.getLogger(__name__)


def process_one_answer() -> bool:
    with get_sync_db() as db:
        answer_id = claim_next_answer(db)
    if answer_id is None:
        return False
    run_process_answer(str(answer_id))
    return True


def process_one_report() -> bool:
    claimed_report_id: str | None = None

    with get_sync_db() as db:
        reports = db.execute(
            select(SuggestionReport)
            .where(SuggestionReport.status == "pending")
            .order_by(SuggestionReport.created_at)
        ).scalars().all()

        for report in reports:
            if report_wait_timed_out(report):
                report.status = "failed"
                report.error_message = (
                    "Timed out waiting for answer assessments to complete"
                )
                logger.error("generate_report timed out for %s", report.id)
                continue

            answer_ids = [uuid.UUID(aid) for aid in report.answer_ids]
            assessments = fetch_assessments(db, answer_ids)
            if not assessments_ready(assessments, len(answer_ids)):
                continue

            if try_claim_report(db, report.id):
                claimed_report_id = str(report.id)
                break

    # Run the job only after the claim is committed (with block has exited).
    # This mirrors process_one_answer and prevents the outer commit from
    # overwriting the "done" status written by run_generate_report.
    if claimed_report_id:
        run_generate_report(claimed_report_id)
        return True

    return False


def run_forever() -> None:
    interval = settings.WORKER_POLL_INTERVAL_SECONDS
    logger.info("Postgres worker started (poll every %ss)", interval)

    while True:
        try:
            if process_one_answer():
                continue
            if process_one_report():
                continue
        except Exception:
            logger.exception("Worker loop error")
        time.sleep(interval)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    run_forever()


if __name__ == "__main__":
    main()
