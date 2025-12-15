from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed, Finalized
from solders.signature import Signature
from typing import Optional, Dict, Any
from app.config import settings
import asyncio


class SolanaPaymentVerifier:
    def __init__(self, rpc_url: str):
        self.client = AsyncClient(rpc_url)

    async def verify_transaction(
        self,
        signature: str,
        expected_amount: float,
        recipient: str,
        memo: Optional[str] = None,
    ) -> bool:
        """
        Verify a Solana transaction matches expected payment parameters
        """
        try:
            # Parse signature
            sig = Signature.from_string(signature)

            # Get transaction with retries
            tx_response = None
            for _ in range(5):  # Retry up to 5 times
                tx_response = await self.client.get_transaction(
                    sig,
                    encoding="jsonParsed",
                    commitment=Confirmed,
                    max_supported_transaction_version=0
                )
                if tx_response.value is not None:
                    break
                await asyncio.sleep(1)

            if tx_response.value is None:
                return False

            tx = tx_response.value
            meta = tx.transaction.meta

            # Check if transaction was successful
            if meta.err is not None:
                return False

            # Get transaction details
            instructions = tx.transaction.transaction.message.instructions

            # Verify transfer instruction
            transfer_found = False
            memo_found = memo is None  # If no memo required, skip check

            for idx, instruction in enumerate(instructions):
                # Check for transfer instruction
                if hasattr(instruction, 'parsed'):
                    parsed = instruction.parsed
                    if isinstance(parsed, dict):
                        info = parsed.get('info', {})
                        instruction_type = parsed.get('type', '')

                        # Check transfer
                        if instruction_type == 'transfer':
                            actual_recipient = info.get('destination', '')
                            lamports = info.get('lamports', 0)

                            # Convert lamports to SOL (or USDC depending on token)
                            # For now assuming SOL, adjust for SPL token
                            actual_amount = lamports / 1_000_000_000

                            if actual_recipient == recipient and abs(actual_amount - expected_amount) < 0.0001:
                                transfer_found = True

                # Check for memo instruction
                if memo and hasattr(instruction, 'data'):
                    try:
                        instruction_data = str(instruction.data)
                        if memo in instruction_data:
                            memo_found = True
                    except:
                        pass

            return transfer_found and memo_found

        except Exception as e:
            print(f"Error verifying transaction: {e}")
            return False

    async def get_transaction_status(
        self,
        signature: str
    ) -> Optional[Dict[str, Any]]:
        """Get the status of a transaction"""
        try:
            sig = Signature.from_string(signature)
            response = await self.client.get_signature_statuses([sig])

            if response.value and len(response.value) > 0:
                status = response.value[0]
                if status:
                    return {
                        "confirmed": status.confirmation_status is not None,
                        "confirmations": status.confirmations or 0,
                        "err": status.err,
                        "status": str(status.confirmation_status) if status.confirmation_status else "unknown"
                    }
            return None
        except Exception as e:
            print(f"Error getting transaction status: {e}")
            return None

    async def wait_for_confirmation(
        self,
        signature: str,
        timeout: int = 60
    ) -> bool:
        """Wait for a transaction to be confirmed"""
        try:
            sig = Signature.from_string(signature)

            for _ in range(timeout):
                status = await self.get_transaction_status(signature)
                if status and status.get("confirmed"):
                    return status.get("err") is None
                await asyncio.sleep(1)

            return False
        except Exception:
            return False

    async def close(self):
        """Close the RPC client"""
        await self.client.close()


# Global verifier instance
payment_verifier: Optional[SolanaPaymentVerifier] = None


def get_payment_verifier() -> SolanaPaymentVerifier:
    """Get the global payment verifier instance"""
    global payment_verifier
    if payment_verifier is None:
        payment_verifier = SolanaPaymentVerifier(settings.SOLANA_RPC_URL)
    return payment_verifier
