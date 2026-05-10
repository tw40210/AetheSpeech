"""
One-shot: add UNCLEAR to every topic row that is missing it.

Run from the backend directory:
    python scripts/backfill_unclear_topic_labels.py
"""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

# Ensure imports work when executed as:
#   python scripts/backfill_unclear_topic_labels.py
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.database import AsyncSessionLocal
from core.topic_labels import ensure_default_unclear_label
import models  # noqa: F401 — register models
from models.topic import Topic


async def main() -> None:
    updated = 0
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Topic))
        for topic in result.scalars().all():
            normalized = ensure_default_unclear_label(topic.labels)
            if normalized != (topic.labels or []):
                topic.labels = normalized
                updated += 1
        await db.commit()
    print(f"Updated {updated} topic(s).")


if __name__ == "__main__":
    asyncio.run(main())
