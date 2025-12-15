from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    verify_wallet_signature
)
from app.models.user import User
from app.schemas.user import UserResponse, TokenResponse, WalletLogin

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/wallet-login", response_model=TokenResponse)
async def wallet_login(
    wallet_data: WalletLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login or register user with wallet (Phantom, etc.)"""
    # Verify signature
    if not verify_wallet_signature(
        wallet_data.wallet_address,
        wallet_data.message,
        wallet_data.signature
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )

    # Check if user exists
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_data.wallet_address)
    )
    user = result.scalar_one_or_none()

    # Create user if doesn't exist
    if not user:
        user = User(
            wallet_address=wallet_data.wallet_address,
            role="user"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user
