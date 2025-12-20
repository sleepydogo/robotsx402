"""
Simple FastAPI server for rUSD airdrop
Handles airdrop requests and mints rUSD tokens to user wallets
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import subprocess
import os
import json
import base64
from datetime import datetime, timedelta
from pathlib import Path

app = FastAPI(title="rUSD Airdrop Server")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (logos, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configuration
SOLANA_ENGINE_PATH = Path(__file__).parent.parent / "solana-engine"
MINT_SCRIPT_PATH = SOLANA_ENGINE_PATH / "scripts" / "mint-rusd-to-user.ts"
AIRDROP_AMOUNT = 50  # rUSD per airdrop
COOLDOWN_HOURS = 24  # Hours between airdrops per wallet

# Simple in-memory storage for cooldowns (replace with Redis/DB in production)
airdrop_history = {}

# Setup wallet path (support both local and cloud deployment)
def setup_wallet():
    """Setup Solana wallet from environment variable or local file"""
    wallet_base64 = os.getenv('SOLANA_WALLET_BASE64')

    if wallet_base64:
        # Cloud deployment: decode wallet from base64 env var
        try:
            wallet_path = '/tmp/solana-wallet.json'
            wallet_data = base64.b64decode(wallet_base64)
            with open(wallet_path, 'w') as f:
                f.write(wallet_data.decode('utf-8'))
            print(f"✅ Wallet loaded from SOLANA_WALLET_BASE64 to {wallet_path}")
            return wallet_path
        except Exception as e:
            print(f"❌ Error decoding wallet: {e}")
            raise RuntimeError(f"Failed to decode SOLANA_WALLET_BASE64: {e}")
    else:
        # Local development: use local wallet file
        local_path = os.path.expanduser("~/.config/solana/id.json")
        if os.path.exists(local_path):
            print(f"✅ Using local wallet: {local_path}")
            return local_path
        else:
            raise RuntimeError(
                "No wallet found! Please set SOLANA_WALLET_BASE64 environment variable "
                "or ensure ~/.config/solana/id.json exists"
            )

WALLET_PATH = setup_wallet()


class AirdropRequest(BaseModel):
    wallet_address: str
    amount: float = AIRDROP_AMOUNT


class AirdropResponse(BaseModel):
    success: bool
    signature: str
    amount: float
    wallet_address: str
    message: str


@app.get("/")
async def root():
    """Serve the main application"""
    return FileResponse("index.html")

@app.get("/styles.css")
async def styles():
    """Serve CSS file"""
    return FileResponse("styles.css", media_type="text/css")

@app.get("/app.js")
async def app_js():
    """Serve JavaScript file"""
    return FileResponse("app.js", media_type="application/javascript")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "rUSD Airdrop Server",
        "airdrop_amount": AIRDROP_AMOUNT,
        "cooldown_hours": COOLDOWN_HOURS
    }


@app.post("/airdrop", response_model=AirdropResponse)
async def request_airdrop(request: AirdropRequest):
    """
    Request an airdrop of rUSD tokens

    - **wallet_address**: Solana wallet address to receive tokens
    - **amount**: Amount of rUSD to airdrop (default: 50)
    """
    wallet_address = request.wallet_address
    amount = min(request.amount, AIRDROP_AMOUNT)  # Cap at max amount

    # Validate wallet address format (basic check)
    if not wallet_address or len(wallet_address) < 32:
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address format"
        )

    # Check cooldown
    if wallet_address in airdrop_history:
        last_airdrop = airdrop_history[wallet_address]
        cooldown_end = last_airdrop + timedelta(hours=COOLDOWN_HOURS)

        if datetime.now() < cooldown_end:
            time_remaining = cooldown_end - datetime.now()
            hours_remaining = time_remaining.total_seconds() / 3600
            raise HTTPException(
                status_code=429,
                detail=f"Airdrop cooldown active. Please wait {hours_remaining:.1f} more hours."
            )

    try:
        # Execute mint script
        print(f"🎁 Processing airdrop: {amount} rUSD -> {wallet_address}")

        # Verify wallet exists
        if not os.path.exists(WALLET_PATH):
            raise HTTPException(
                status_code=500,
                detail=f"Wallet not found at {WALLET_PATH}. Please configure SOLANA_WALLET_BASE64 environment variable."
            )

        print(f"📝 Using wallet: {WALLET_PATH}")

        # Change to solana-engine directory
        os.chdir(SOLANA_ENGINE_PATH)

        # Prepare environment variables for Anchor
        env = os.environ.copy()
        env["ANCHOR_PROVIDER_URL"] = os.getenv("ANCHOR_PROVIDER_URL", "https://api.devnet.solana.com")
        env["ANCHOR_WALLET"] = WALLET_PATH

        print(f"🔧 Environment: ANCHOR_WALLET={env['ANCHOR_WALLET']}, ANCHOR_PROVIDER_URL={env['ANCHOR_PROVIDER_URL']}")

        # Run the TypeScript minting script
        result = subprocess.run(
            ["ts-node", str(MINT_SCRIPT_PATH), wallet_address, str(amount)],
            capture_output=True,
            text=True,
            timeout=60,  # 60 second timeout
            env=env
        )

        # Parse output to get transaction signature
        output = result.stdout
        print(f"Script output:\n{output}")

        if result.returncode != 0:
            error_msg = result.stderr or "Unknown error occurred"
            print(f"❌ Error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to mint tokens: {error_msg}"
            )

        # Extract transaction signature from output
        signature = None
        for line in output.split('\n'):
            if 'Transaction signature:' in line:
                signature = line.split('Transaction signature:')[1].strip()
                break

        if not signature:
            # Fallback: try to parse from explorer URL
            for line in output.split('\n'):
                if 'explorer.solana.com/tx/' in line:
                    signature = line.split('/tx/')[1].split('?')[0]
                    break

        if not signature:
            raise HTTPException(
                status_code=500,
                detail="Could not extract transaction signature from output"
            )

        # Update cooldown
        airdrop_history[wallet_address] = datetime.now()

        print(f"✅ Airdrop successful: {signature}")

        return AirdropResponse(
            success=True,
            signature=signature,
            amount=amount,
            wallet_address=wallet_address,
            message=f"Successfully airdropped {amount} rUSD to your wallet!"
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="Airdrop request timed out. Please try again."
        )
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/history/{wallet_address}")
async def get_airdrop_history(wallet_address: str):
    """Check airdrop history for a wallet"""
    if wallet_address not in airdrop_history:
        return {
            "wallet_address": wallet_address,
            "last_airdrop": None,
            "can_request": True,
            "cooldown_remaining_hours": 0
        }

    last_airdrop = airdrop_history[wallet_address]
    cooldown_end = last_airdrop + timedelta(hours=COOLDOWN_HOURS)
    can_request = datetime.now() >= cooldown_end

    time_remaining = max(0, (cooldown_end - datetime.now()).total_seconds() / 3600)

    return {
        "wallet_address": wallet_address,
        "last_airdrop": last_airdrop.isoformat(),
        "can_request": can_request,
        "cooldown_remaining_hours": round(time_remaining, 2)
    }


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting rUSD Airdrop Server")
    print(f"📍 Airdrop amount: {AIRDROP_AMOUNT} rUSD")
    print(f"⏰ Cooldown period: {COOLDOWN_HOURS} hours")

    # Check wallet exists
    if not os.path.exists(WALLET_PATH):
        print(f"\n⚠️  WARNING: Solana wallet not found at {WALLET_PATH}")
        print("Please ensure you have a Solana wallet configured.")
        print("For local: Run 'solana-keygen new'")
        print("For cloud: Set SOLANA_WALLET_BASE64 environment variable")
    else:
        print(f"✅ Wallet found: {WALLET_PATH}")

    print(f"\n🌐 Server: http://localhost:8002")
    print(f"📁 Static files: http://localhost:8002/static/index.html")
    print("")

    uvicorn.run(app, host="0.0.0.0", port=8002)
