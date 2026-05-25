"""
Migrate suggestion_reports.suggestions from TEXT to JSON.

Plain-text suggestions from the old format are cleared (set to NULL) because
they cannot be parsed into structured feedback.

Run from the backend directory:
    python scripts/migrate_suggestions_to_json.py
"""

import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.config import settings


def _connect():
    url = settings.SYNC_DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    return psycopg2.connect(url)


def main() -> None:
    with _connect() as conn:
        conn.autocommit = False
        cur = conn.cursor()

        cur.execute(
            """
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'suggestion_reports'
              AND column_name = 'suggestions'
            """
        )
        row = cur.fetchone()
        if row is None:
            print("Column suggestion_reports.suggestions not found — nothing to migrate.")
            return

        current_type = row[0]
        if current_type in ("json", "jsonb"):
            print(f"suggestion_reports.suggestions is already {current_type}; no migration needed.")
            return

        cur.execute(
            """
            SELECT COUNT(*)
            FROM suggestion_reports
            WHERE suggestions IS NOT NULL
              AND left(trim(suggestions), 1) <> '{'
            """
        )
        plain_text_count = cur.fetchone()[0]

        cur.execute(
            """
            UPDATE suggestion_reports
            SET suggestions = NULL
            WHERE suggestions IS NOT NULL
              AND left(trim(suggestions), 1) <> '{'
            """
        )
        cleared = cur.rowcount

        cur.execute(
            """
            ALTER TABLE suggestion_reports
            ALTER COLUMN suggestions TYPE JSON
            USING (
                CASE
                    WHEN suggestions IS NULL THEN NULL
                    WHEN left(trim(suggestions), 1) = '{' THEN suggestions::json
                    ELSE NULL
                END
            )
            """
        )

        conn.commit()
        print(
            f"Migrated suggestion_reports.suggestions from {current_type} to JSON. "
            f"Cleared {cleared} plain-text row(s) "
            f"({plain_text_count} detected)."
        )


if __name__ == "__main__":
    main()
