from fastapi import APIRouter

from api.admin import db_browser, workflows

router = APIRouter(prefix="/admin", tags=["admin"])

router.include_router(db_browser.router)
router.include_router(workflows.router)
