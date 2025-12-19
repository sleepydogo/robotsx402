from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Response
from pydantic import BaseModel
from app.config import settings
import uuid


class X402PaymentData(BaseModel):
    session_id: str
    amount: float
    currency: str = "rUSD"
    network: str
    recipient: str
    service: str
    robot_id: str
    expires_at: datetime
    memo: str


class X402ResponseBody(BaseModel):
    error: str = "Payment Required"
    session_id: str
    amount: float
    currency: str
    network: str
    recipient: str
    expires_at: datetime
    service: str
    robot_id: str
    message: str = "Please complete the payment to access this service"


def generate_x402_response(
    robot_id: str,
    robot_name: str,
    amount: float,
    recipient_address: str,
    service: str,
    session_id: Optional[str] = None,
) -> Response:
    """
    Generate a standard HTTP 402 Payment Required response
    following the x402 protocol specification.
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    expires_at = datetime.utcnow() + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

    payment_data = X402PaymentData(
        session_id=session_id,
        amount=amount,
        currency="rUSD",
        network=f"solana-{settings.SOLANA_NETWORK}",
        recipient=recipient_address,
        service=service,
        robot_id=robot_id,
        expires_at=expires_at,
        memo=session_id,  # Use session_id as memo for verification
    )

    response_body = X402ResponseBody(
        session_id=payment_data.session_id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        network=payment_data.network,
        recipient=payment_data.recipient,
        expires_at=payment_data.expires_at,
        service=payment_data.service,
        robot_id=payment_data.robot_id,
    )

    headers = {
        "X-Payment-Required": "true",
        "X-Payment-Amount": str(payment_data.amount),
        "X-Payment-Currency": payment_data.currency,
        "X-Payment-Network": payment_data.network,
        "X-Payment-Address": payment_data.recipient,
        "X-Session-ID": payment_data.session_id,
        "X-Payment-Memo": payment_data.memo,
        "X-Expires-At": payment_data.expires_at.isoformat(),
    }

    return Response(
        content=response_body.model_dump_json(),
        status_code=402,
        headers=headers,
        media_type="application/json",
    )


def parse_x402_headers(headers: Dict[str, str]) -> Optional[X402PaymentData]:
    """
    Parse x402 payment data from response headers.
    Used by clients to extract payment information.
    """
    try:
        return X402PaymentData(
            session_id=headers.get("X-Session-ID", ""),
            amount=float(headers.get("X-Payment-Amount", "0")),
            currency=headers.get("X-Payment-Currency", "rUSD"),
            network=headers.get("X-Payment-Network", ""),
            recipient=headers.get("X-Payment-Address", ""),
            service="",  # Not in headers, get from body
            robot_id="",  # Not in headers, get from body
            expires_at=datetime.fromisoformat(
                headers.get("X-Expires-At", datetime.utcnow().isoformat())
            ),
            memo=headers.get("X-Payment-Memo", ""),
        )
    except Exception:
        return None
