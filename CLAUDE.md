# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

x402 Payment Protocol Platform - A pay-per-use service platform where users/agents pay robots for services using HTTP 402 Payment Required protocol, backed by Solana blockchain payments.

**Tech Stack:**
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Solana Wallet Adapter
- Backend: FastAPI, SQLAlchemy, Redis, PostgreSQL
- Blockchain: Solana (devnet), Anchor Framework, SPL Token program

## Development Commands

### Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python -m app.main
```

**Backend runs on:** `http://localhost:8000`
**API Documentation:** `http://localhost:8000/docs`

### Frontend (Next.js)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

**Frontend runs on:** `http://localhost:3000`

### Solana Smart Contract (Anchor)
```bash
# Navigate to solana-engine directory
cd solana-engine

# Install dependencies
yarn install

# Build the program
anchor build

# Run tests (localnet)
anchor test

# Run tests on devnet
anchor test --skip-local-validator

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Initialize stablecoin after deployment
ts-node scripts/deploy.ts

# Mint tokens to an account
ts-node scripts/mint-tokens.ts
```

### Solana Configuration
```bash
# Set to devnet
solana config set --url devnet

# Get devnet SOL for testing
solana airdrop 2

# Check balance
solana balance
```

## Architecture Overview

### Three-Tier System

1. **Frontend (Next.js)**: User interface with x402 payment flow integration
   - Automatic 402 detection via Axios interceptor in `lib/api/client.ts`
   - Payment modal triggered on 402 responses
   - Wallet connection via Solana Wallet Adapter
   - Auto-retry after successful payment verification

2. **Backend (FastAPI)**: x402 protocol implementation and business logic
   - **x402 Module** (`core/x402.py`): Generates 402 responses with payment metadata
   - **Payment Verifier** (`core/blockchain.py`): Verifies on-chain transactions
   - **Session Manager** (`core/session.py`): Manages payment sessions in Redis (15 min TTL)
   - **Robot Executor** (routes in `api/routes/execute.py`): Executes robot services after payment

3. **Blockchain (Solana)**: On-chain payment verification
   - Stablecoin program at `solana-engine/programs/solana-stablecoin/src/lib.rs`
   - Program ID: `9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj` (devnet)
   - Uses PDAs (Program Derived Addresses) with seed `b"stablecoin"`

### x402 Payment Flow

The core innovation is the automatic payment-gate mechanism:

1. User requests robot execution → `POST /api/execute/{robot_id}`
2. Backend checks for valid `X-Session-ID` header
3. If no valid session → return **402 Payment Required** with headers:
   - `X-Payment-Amount`, `X-Payment-Currency`, `X-Payment-Address`
   - `X-Session-ID`, `X-Payment-Memo`
4. Frontend Axios interceptor catches 402 → shows `PaymentModal`
5. User connects wallet and pays on Solana
6. Frontend submits transaction signature → `POST /api/payments/verify`
7. Backend verifies transaction on-chain (amount, recipient, memo)
8. Backend marks session as "paid" in Redis
9. Frontend auto-retries original request with `X-Session-ID` header
10. Backend validates session → executes robot → returns result

**Key Files:**
- Frontend interceptor: `frontend/lib/api/client.ts`
- x402 handler: `frontend/lib/x402/handler.ts`
- Payment modal: `frontend/components/x402/PaymentModal.tsx`
- Backend x402 generator: `backend/app/core/x402.py`
- Payment verification: `backend/app/core/blockchain.py`

### Database Schema

**Users Table:**
- id, email, password_hash, role (user | robot_owner | admin), wallet_address, total_spent

**Robots Table:**
- id, owner_id, name, description, price, currency (USDC), wallet_address, services (JSONB), endpoint, status, execution_count, total_revenue, metrics

**PaymentSessions Table:** (Also cached in Redis)
- id (session_id), user_id, robot_id, amount, recipient_address, status (pending | paid | expired), tx_signature, service_payload, created_at, expires_at

**ExecutionLogs Table:**
- id, session_id, robot_id, user_id, status, response_time, error, executed_at

### Role-Based Access Control

Defined in `backend/app/core/security.py`:
- **user**: Can execute robots and make payments
- **robot_owner**: Can create and manage robots
- **admin**: Full system access

Use `require_role()` decorator to protect endpoints.

## Important Implementation Details

### Solana Program (Stablecoin)

The Anchor program provides:
- `initialize(decimals)`: Initialize stablecoin with 6 decimals (USDC-compatible)
- `mint_tokens(amount)`: Mint new tokens (authority only)
- `burn_tokens(amount)`: Burn tokens from account
- `transfer_tokens(amount)`: Transfer between accounts
- `pause()` / `unpause()`: Emergency pause mechanism
- `transfer_authority(new_authority)`: Transfer program authority

**Security Features:**
- Authority verification for privileged operations
- Overflow/underflow protection with `checked_add`/`checked_sub`
- Emergency pause functionality
- PDA-based mint authority for security

**After deployment, update Program ID in:**
- `solana-engine/Anchor.toml`
- `solana-engine/programs/solana-stablecoin/src/lib.rs` (line 4: `declare_id!()`)

### Payment Verification

Backend verifies Solana transactions by checking:
1. Transaction exists and is confirmed
2. Recipient matches expected wallet address
3. Amount matches session amount
4. Memo contains session_id for correlation

**Critical:** All three verification points must pass before marking session as paid.

### Session Management

Sessions stored in Redis with 15-minute expiration:
- Key format: `session:{session_id}`
- Contains: user_id, robot_id, amount, recipient, status, timestamps
- Status transitions: pending → paid → executed
- Expired sessions return 402 again (create new session)

## Environment Variables

### Backend `.env`
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/x402_platform
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
STABLECOIN_MINT=9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj
SESSION_EXPIRE_MINUTES=15
```

### Frontend `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

## Testing & Debugging

### Verify Solana Transactions
Check transactions on Solana Explorer:
```
https://explorer.solana.com/tx/[SIGNATURE]?cluster=devnet
```

### Common Issues

**"402 infinite loop":**
- Verify session_id is included in retry request headers
- Check Redis connection and session storage
- Clear browser localStorage

**"Transaction verification failed":**
- Ensure memo field matches session_id exactly
- Verify amount is precise (no rounding errors)
- Confirm transaction has sufficient confirmations
- Check recipient address matches

**"Database connection failed":**
```bash
# Create database if missing
createdb x402_platform
```

**"Redis connection failed":**
```bash
# Verify Redis is running
redis-cli ping  # Should return PONG
```

## Key Architectural Patterns

### Frontend x402 Auto-Handling
The Axios response interceptor automatically detects 402 responses and triggers the payment flow, making the payment process seamless. The original request is automatically retried after successful payment verification.

### PDA-Based Mint Authority
The Solana program uses a PDA derived from seed `b"stablecoin"` as the mint authority, ensuring only the program can mint tokens through proper instruction validation.

### Dual Storage (PostgreSQL + Redis)
Payment sessions are stored in both PostgreSQL (permanent record) and Redis (fast access with TTL). Redis provides quick session validation, while PostgreSQL maintains audit trail.

### Event-Driven Payment Modal
Frontend uses CustomEvents (`x402-payment-required`, `x402-payment-completed`) to decouple the payment modal from the API client, allowing flexible payment UI implementations.

## Database Migrations

The backend uses Alembic for database migrations:

```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

**Note:** Before running migrations, ensure PostgreSQL is running and DATABASE_URL is configured in `.env`.

## Project Structure Notes

### Backend Structure
```
backend/
├── app/
│   ├── main.py                    # FastAPI app initialization, CORS, routers
│   ├── config.py                  # Settings via Pydantic BaseSettings
│   ├── database.py                # AsyncPG + SQLAlchemy setup
│   ├── core/
│   │   ├── x402.py                # 402 response generation
│   │   ├── blockchain.py          # Solana payment verification
│   │   ├── session.py             # Redis session management
│   │   └── security.py            # JWT, password hashing, RBAC
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── robot.py
│   │   └── payment.py
│   ├── schemas/                   # Pydantic request/response models
│   ├── api/routes/                # API endpoints
│   │   ├── auth.py                # /api/auth/* (register, login)
│   │   ├── robots.py              # /api/robots/* (CRUD, metrics)
│   │   ├── payments.py            # /api/payments/* (verify, session status)
│   │   └── execute.py             # /api/execute/{robot_id} (main x402 flow)
│   └── services/
│       └── robot_executor.py      # Robot execution & metrics tracking
└── requirements.txt
```

### Frontend Structure
```
frontend/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Landing page
│   ├── (auth)/                    # Auth route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx         # Robot dashboard
│   ├── robots/
│   │   ├── page.tsx               # Robot list
│   │   └── [id]/page.tsx          # Robot details & execution
│   └── control/[id]/page.tsx      # Robot control interface
├── components/
│   ├── robots/                    # Robot-related components
│   ├── wallet/
│   │   └── WalletProvider.tsx     # Solana wallet setup
│   └── x402/
│       └── PaymentModal.tsx       # Payment modal UI
├── contexts/
│   └── AuthContext.tsx            # Auth state management
├── lib/
│   ├── api/
│   │   ├── client.ts              # Axios with x402 interceptor
│   │   ├── auth.ts                # Auth API calls
│   │   ├── payments.ts            # Payment verification API
│   │   └── robots.ts              # Robot management API
│   ├── blockchain/
│   │   └── payment.ts             # Solana transaction creation
│   └── x402/
│       └── handler.ts             # x402 CustomEvent dispatcher
└── types/                         # TypeScript definitions
```

### Solana Engine Structure
```
solana-engine/
├── programs/solana-stablecoin/
│   └── src/lib.rs                 # 7 instructions: initialize, mint, burn, transfer, pause, unpause, transfer_authority
├── scripts/
│   ├── deploy.ts                  # Initialize stablecoin state
│   └── mint-tokens.ts             # Mint tokens to account
├── tests/
│   └── solana-stablecoin.ts       # Comprehensive test suite
└── Anchor.toml                    # Program ID: 9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj
```