from contextlib import contextmanager

from core.database import SyncSessionLocal


@contextmanager
def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
