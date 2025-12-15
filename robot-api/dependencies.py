"""
FastAPI dependencies for authentication and authorization
"""
from fastapi import Header, HTTPException, status, Request
from typing import Optional
from config import settings


async def verify_api_key(request: Request, x_api_key: Optional[str] = Header(None)):
    """
    Dependency to verify API key from request headers

    Args:
        request: FastAPI request object
        x_api_key: API key from X-API-Key header

    Raises:
        HTTPException: If API key is missing or invalid

    Returns:
        str: Validated API key
    """
    # Allow OPTIONS requests (CORS preflight) without authentication
    if request.method == "OPTIONS":
        return None

    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Include X-API-Key header in your request.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if x_api_key not in settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key",
        )

    return x_api_key
