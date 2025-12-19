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
        Verify a Solana SPL token (rUSD) transaction matches expected payment parameters
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
                print(f"Transaction not found: {signature}")
                return False

            tx = tx_response.value
            meta = tx.transaction.meta

            # Check if transaction was successful
            if meta.err is not None:
                print(f"Transaction failed with error: {meta.err}")
                return False

            # Get transaction details
            instructions = tx.transaction.transaction.message.instructions

            # Expected amount in token units (6 decimals for rUSD)
            RUSD_DECIMALS = 6
            expected_token_amount = int(expected_amount * (10 ** RUSD_DECIMALS))

            # Verify transfer instruction
            transfer_found = False
            memo_found = memo is None  # If no memo required, skip check

            for idx, instruction in enumerate(instructions):
                # Check for SPL token transfer instruction
                if hasattr(instruction, 'parsed'):
                    parsed = instruction.parsed
                    if isinstance(parsed, dict):
                        info = parsed.get('info', {})
                        instruction_type = parsed.get('type', '')

                        # Check for SPL token transfer (type: "transfer" or "transferChecked")
                        if instruction_type in ['transfer', 'transferChecked']:
                            # Get token amount
                            token_amount = info.get('amount')
                            if isinstance(token_amount, str):
                                token_amount = int(token_amount)

                            # For transferChecked, amount is in 'tokenAmount'
                            if instruction_type == 'transferChecked':
                                token_amount_info = info.get('tokenAmount', {})
                                token_amount = int(token_amount_info.get('amount', 0))

                            print(f"Found SPL transfer: type={instruction_type}, amount={token_amount}, expected={expected_token_amount}")
                            print(f"Transfer info: {info}")

                            # Tolerance: allow 0.01 rUSD difference (10000 token units)
                            tolerance = 10000
                            if abs(token_amount - expected_token_amount) <= tolerance:
                                transfer_found = True
                                print(f"✓ Transfer amount verified: {token_amount} ~= {expected_token_amount}")
                            else:
                                print(f"✗ Amount mismatch: {token_amount} vs {expected_token_amount}")

                # Check for memo instruction
                if memo and hasattr(instruction, 'data'):
                    try:
                        instruction_data = str(instruction.data)
                        if memo in instruction_data:
                            memo_found = True
                            print(f"Memo found: {memo}")
                    except:
                        pass

            print(f"Verification result: transfer_found={transfer_found}, memo_found={memo_found}")
            return transfer_found and memo_found

        except Exception as e:
            print(f"Error verifying transaction: {e}")
            import traceback
            traceback.print_exc()
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
