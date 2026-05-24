from fastapi import Header, HTTPException, status

from core.config import settings


async def verify_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    """Dependency that validates the X-Admin-Key header against ADMIN_API_KEY in config."""
    if not settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin API is not configured. Set ADMIN_API_KEY in backend/.env",
        )
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin key",
        )
