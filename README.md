## Project Overview

ROBOTSx402 - A decentralized robot hardware rental platform where users/agents pay robots for services using HTTP 402 Payment Required protocol, backed by Solana blockchain payments (rUSD stablecoin and native SOL).

## 🔗 Links

- [Live Platform](https://robotsx402.fun/)
- [Solana Program (Devnet)](https://explorer.solana.com/address/9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj?cluster=devnet)
- [rUSD Token](https://explorer.solana.com/address/8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX?cluster=devnet)

**Core Innovation:** Automatic payment-gate mechanism using HTTP 402 status code with blockchain settlement.

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Solana Wallet Adapter
- **Backend:** FastAPI, SQLAlchemy (async), Redis, PostgreSQL, Alembic migrations
- **Blockchain:** Solana (devnet), Anchor Framework, SPL Token program
- **Robot Control:** Separate FastAPI service with PySerial for Arduino hardware control

## Development Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
alembic downgrade -1
```

**Backend runs on:** `http://localhost:8000`
**API Documentation:** `http://localhost:8000/docs`

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev          # Development
npm run build        # Production build
npm start            # Production server
```

**Frontend runs on:** `http://localhost:3000`

### Solana Smart Contract (Anchor)
```bash
cd solana-engine
yarn install

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Testing
anchor test                        # Localnet
anchor test --skip-local-validator # Devnet

# Initialize stablecoin after deployment
ts-node scripts/deploy.ts

# Mint rUSD to user accounts
ts-node scripts/mint-rusd-to-user.ts

# Create token metadata
ts-node scripts/create-metadata-via-program.ts
```

### Solana CLI Configuration
```bash
solana config set --url devnet
solana airdrop 2
solana balance
solana account <ADDRESS>
```

### Robot API (Hardware Control)
```bash
cd robot-api
pip install -r requirements.txt
python main.py       # Runs on port 8001
```

## Architecture Overview

### Three-Tier Payment System

1. **Frontend (Next.js)**: User interface with automatic x402 payment flow
   - Axios interceptor in `lib/api/client.ts` auto-detects 402 responses
   - Payment modal triggered via CustomEvents (loose coupling)
   - Wallet connection via Solana Wallet Adapter
   - Auto-retry after successful payment verification

2. **Backend (FastAPI)**: x402 protocol implementation
   - **x402 Module** (`app/core/x402.py`): Generates 402 responses with payment metadata headers
   - **Payment Verifier** (`app/core/blockchain.py`): Verifies on-chain Solana transactions
   - **Session Manager** (`app/core/session.py`): Redis-based sessions with 15-minute TTL
   - **Robot Executor** (`app/api/routes/execute.py`): Executes robot services after payment
   - **AI Interface Generator** (`app/api/routes/robots.py`): Claude AI generates dynamic control UIs

3. **Blockchain (Solana)**: On-chain payment verification
   - Custom rUSD stablecoin at `solana-engine/programs/solana-stablecoin/src/lib.rs`
   - **Current Program ID:** `9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj` (devnet)
   - **Current Mint Address:** `8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX` (rUSD token)
   - Uses PDAs with seed `b"stablecoin"` for secure mint authority

4. **Robot API**: Hardware control service
   - FastAPI server for robotic arm control (chess playing robot)
   - PySerial communication with Arduino
   - MJPEG video streaming via OpenCV
   - API key-based authentication

### x402 Payment Flow (Core Innovation)

The automatic payment-gate mechanism:

1. User requests robot execution → `POST /api/execute/{robot_id}`
2. Backend checks for valid `X-Session-ID` header
3. **If no valid session → Return HTTP 402 with headers:**
   - `X-Session-ID`: Unique payment session identifier
   - `X-Payment-Amount`: Amount in rUSD
   - `X-Payment-Currency`: Token type (rUSD/USDC)
   - `X-Payment-Address`: Robot owner's wallet address
   - `X-Payment-Memo`: Session ID for transaction correlation
   - `X-Payment-Network`: Network identifier (solana-devnet)
4. Frontend Axios interceptor catches 402 → dispatches `x402-payment-required` CustomEvent
5. PaymentModal component listens to event and opens
6. User connects wallet and pays on Solana (rUSD transfer)
7. Frontend submits transaction signature → `POST /api/payments/verify`
8. Backend verifies transaction on-chain:
   - ✓ Transaction exists and is confirmed
   - ✓ Recipient matches expected wallet address
   - ✓ Amount matches session amount (with tolerance)
   - ✓ Memo contains session_id for correlation
9. Backend marks session as "paid" in Redis
10. Frontend auto-retries original request with `X-Session-ID` header
11. Backend validates paid session → executes robot task → returns result

**Key Implementation Files:**
- Frontend interceptor: `frontend/lib/api/client.ts`
- x402 handler: `frontend/lib/x402/handler.ts`
- Payment modal: `frontend/components/payment/RobotPaymentModal.tsx`
- Backend x402 generator: `backend/app/core/x402.py`
- Payment verification: `backend/app/core/blockchain.py`
- Session management: `backend/app/core/session.py`

### Dynamic Robot Control System (AI-Powered)

The platform dynamically generates control interfaces for robots:

1. Admin/owner registers robot with `control_api_url`
2. System calls `POST /api/robots/explore-api` with API documentation URL
3. Claude AI analyzes API endpoints and generates optimal control configuration
4. Configuration stored in `robots.interface_config` (JSONB)
5. Frontend renders ~12 dynamic controls:
   - **ControlButton**: Discrete actions (e.g., "Reset Position")
   - **ControlSlider**: Continuous values (e.g., "Speed: 0-100")
   - **ControlJoystick**: 2D positioning (e.g., "XY Movement")
   - **ControlToggle**: On/off switches (e.g., "Enable Motors")
6. User controls robot through dynamically generated UI without code changes

**Key Files:**
- AI generator: `backend/app/api/routes/robots.py` (`explore_robot_api` endpoint)
- Dynamic renderer: `frontend/components/robot-controls/DynamicControl.tsx`
- Control components: `frontend/components/robot-controls/*.tsx`

### Database Schema

**Users:**
- id (UUID), email, password_hash, role (user | robot_owner | admin)
- wallet_address, total_spent, created_at

**Robots:**
- id (UUID), owner_id, name, description, price, currency (rUSD/USDC)
- wallet_address, services (JSONB array), endpoint, status
- **control_api_url**, **video_stream_url**, **has_gps**, **gps_coordinates** (JSON)
- **interface_config** (JSONB) - AI-generated control UI configuration
- execution_count, total_revenue, avg_response_time, success_rate

**PaymentSessions:** (Dual storage: PostgreSQL + Redis)
- id (session_id), user_id, robot_id, amount, currency, recipient_address
- status (pending | paid | expired), tx_signature, service_payload
- created_at, expires_at (15 min), paid_at

**ExecutionLogs:**
- id, session_id, robot_id, user_id, status, response_time, error, executed_at

### Role-Based Access Control

Defined in `backend/app/core/security.py`:
- **user**: Execute robots and make payments
- **robot_owner**: Create and manage robots
- **admin**: Full system access

Use `require_role()` dependency injection decorator to protect endpoints.

## Important Implementation Details

### Solana Stablecoin Program (rUSD)

The Anchor program provides 7 instructions:
- `initialize(decimals)`: Initialize stablecoin state (6 decimals, USDC-compatible)
- `mint_tokens(amount)`: Mint new rUSD (authority only)
- `burn_tokens(amount)`: Burn tokens from account
- `transfer_tokens(amount)`: Transfer between accounts
- `pause()` / `unpause()`: Emergency pause mechanism
- `transfer_authority(new_authority)`: Transfer program authority

**Security Features:**
- PDA-based mint authority (`seed: b"stablecoin"`) - only program can mint
- Authority verification for privileged operations
- Overflow/underflow protection with `checked_add`/`checked_sub`
- Emergency pause functionality

**Token Metadata:**
- Uses Metaplex Token Metadata Program
- Scripts in `solana-engine/scripts/` handle metadata creation
- Symbol: rUSD, Name: Robot USD

**After deployment, update Program ID in:**
1. `solana-engine/Anchor.toml`
2. `solana-engine/programs/solana-stablecoin/src/lib.rs` (line 4: `declare_id!()`)
3. Rebuild with `anchor build` and redeploy

### Payment Verification (Critical Path)

Backend verifies Solana transactions (`app/core/blockchain.py`):

```python
# All four checks must pass:
1. Transaction exists and is confirmed on-chain
2. Recipient matches expected robot wallet address
3. Amount matches session amount (exact match)
4. Memo field contains session_id
```

**CRITICAL:** All verification points must pass before marking session as paid.

### Session Management (Dual Storage Pattern)

Sessions stored in **both** Redis and PostgreSQL:

**Redis Format** (15-minute TTL):
```python
Key: "session:{session_id}"
Value: {
    "id": "uuid",
    "user_id": "uuid",
    "robot_id": "uuid",
    "amount": 0.5,
    "currency": "rUSD",
    "recipient_address": "wallet...",
    "status": "pending|paid|expired",
    "tx_signature": "...",
    "service_payload": {},
    "created_at": "ISO8601",
    "expires_at": "ISO8601",
    "paid_at": null
}
```

**Why Dual Storage:**
- **Redis:** Fast session validation (<1ms lookups), auto-expiry with TTL
- **PostgreSQL:** Permanent audit trail, revenue tracking, analytics

Status transitions: `pending` → `paid` → `executed`

Expired sessions return 402 again (creates new session).

### Frontend x402 Interceptor (Auto-Handling)

The Axios response interceptor (`lib/api/client.ts`) automatically:
1. Detects 402 responses
2. Extracts payment metadata from headers
3. Dispatches `x402-payment-required` CustomEvent
4. Waits for `x402-payment-completed` CustomEvent
5. Auto-retries original request with `X-Session-ID` header

**Decoupling via CustomEvents:**
- Payment modal can be replaced independently
- Multiple payment UI implementations possible
- Clean separation between API client and payment UI

## Environment Variables

### Backend `.env`
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/x402_platform
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
STABLECOIN_MINT=8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX

# Session Configuration
SESSION_EXPIRE_MINUTES=15

# AI Configuration (for dynamic interface generation)
ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

### Robot API `.env`
```bash
API_KEY=your-robot-api-key
ARDUINO_PORT=/dev/ttyUSB0  # Auto-detected on all platforms
CAMERA_INDEX=0
```

## Testing & Debugging

### Verify Solana Transactions
```bash
# Check transaction on Solana Explorer
https://explorer.solana.com/tx/[SIGNATURE]?cluster=devnet

# Check account balance
solana balance [WALLET_ADDRESS] --url devnet

# Check token account
solana account [TOKEN_ACCOUNT_ADDRESS] --url devnet
```

### Common Issues

**"402 infinite loop":**
- Verify `X-Session-ID` header is included in retry request
- Check Redis connection: `redis-cli ping` (should return PONG)
- Clear browser localStorage and cookies
- Check browser console for interceptor errors

**"Transaction verification failed":**
- Ensure memo field matches session_id exactly
- Verify amount is precise (no rounding errors)
- Confirm transaction has sufficient confirmations (use `confirmed` commitment)
- Check recipient address matches robot wallet in session
- View transaction on Solana Explorer to debug

**"Database connection failed":**
```bash
# Create database if missing
createdb x402_platform

# Check PostgreSQL is running
psql -U postgres -d x402_platform
```

**"Redis connection failed":**
```bash
# Verify Redis is running
redis-cli ping  # Should return PONG

# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:latest
```

**"Program ID mismatch" (Solana):**
- Ensure Program ID in `Anchor.toml` matches `declare_id!()` in `lib.rs`
- After updating, run `anchor build && anchor deploy`

**"Robot API connection error":**
- Verify robot-api is running on port 8001
- Check Arduino is connected: `ls /dev/tty*` (Linux/Mac) or Device Manager (Windows)
- Verify API key in robot-api `.env`

## Key Architectural Patterns

### 1. PDA-Based Mint Authority
The Solana program uses a PDA derived from seed `b"stablecoin"` as the mint authority. This ensures **only the program** can mint tokens through proper instruction validation, not even the deployer's wallet.

```rust
let seeds = &[
    b"stablecoin".as_ref(),
    &[ctx.bumps.stablecoin_state],
];
// Only program can sign with this PDA
```

### 2. Event-Driven Payment Modal
Frontend uses CustomEvents for loose coupling:
- `x402-payment-required`: Triggers payment modal
- `x402-payment-completed`: Signals payment success

This allows flexible payment UI implementations without modifying the API client.

### 3. Dual Storage Pattern (PostgreSQL + Redis)
- **Redis:** 15-min TTL, <1ms session validation for hot path
- **PostgreSQL:** Permanent record for audit trail, analytics, revenue tracking

### 4. AI-Powered Interface Generation
System uses Claude AI to analyze robot APIs and generate control UIs. Configuration stored as JSONB in database, frontend renders dynamically. This enables **zero-code robot integration** - just provide an API URL.

### 5. Multi-Token Support
- **rUSD:** Custom SPL token for platform payments (6 decimals)
- **SOL:** Native token support for alternative payment flow
- USDC-compatible decimal precision

## Project Structure

### Backend (`/backend`)
```
app/
├── main.py                         # FastAPI initialization, CORS, routers
├── config.py                       # Pydantic Settings (env vars)
├── database.py                     # AsyncPG + SQLAlchemy session factory
├── core/
│   ├── x402.py                     # 402 response generation with headers
│   ├── session.py                  # PaymentSessionManager (Redis ops)
│   ├── blockchain.py               # SolanaPaymentVerifier (on-chain)
│   └── security.py                 # JWT, password hashing, RBAC decorators
├── models/                         # SQLAlchemy ORM models
│   ├── user.py
│   ├── robot.py                    # Includes interface_config JSONB
│   └── payment.py
├── schemas/                        # Pydantic request/response DTOs
│   ├── x402.py
│   ├── payment.py
│   └── robot.py
├── api/routes/
│   ├── auth.py                     # /api/auth/* (register, login)
│   ├── robots.py                   # /api/robots/* (CRUD, AI explorer)
│   ├── payments.py                 # /api/payments/verify
│   └── execute.py                  # /api/execute/{robot_id} (402 flow)
├── services/
│   └── robot_executor.py           # Robot execution + metrics tracking
└── migrations/                     # Alembic database migrations
```

### Frontend (`/frontend`)
```
app/                                # Next.js 14 App Router
├── layout.tsx                      # Root with WalletProvider + AuthProvider
├── page.tsx                        # Landing page
├── (auth)/                         # Route group
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/page.tsx              # User dashboard
├── robots/
│   ├── page.tsx                    # Robot discovery/list
│   └── [id]/page.tsx               # Robot details
└── control/[id]/page.tsx           # Dynamic control interface

components/
├── payment/
│   └── RobotPaymentModal.tsx       # rUSD payment UI with Framer Motion
├── robot-controls/                 # Dynamic control components
│   ├── DynamicControl.tsx          # Main renderer
│   ├── ControlButton.tsx           # Discrete actions
│   ├── ControlSlider.tsx           # Continuous values
│   ├── ControlJoystick.tsx         # 2D positioning
│   └── ControlToggle.tsx           # On/off switches
├── dashboard/
│   ├── CreateRobot.tsx             # Robot registration form
│   └── RobotFleet.tsx              # Fleet management
└── wallet/
    └── WalletProvider.tsx          # Solana wallet context

lib/
├── api/
│   ├── client.ts                   # Axios with x402 interceptor ⚡
│   ├── robots.ts
│   ├── payments.ts
│   └── auth.ts
├── blockchain/
│   ├── robotPayment.ts             # rUSD SPL token transfers
│   └── payment.ts                  # Native SOL transfers
└── x402/
    └── handler.ts                  # CustomEvent dispatcher

contexts/
├── AuthContext.tsx
└── WalletContext.tsx
```

### Solana Engine (`/solana-engine`)
```
programs/solana-stablecoin/
└── src/lib.rs                      # 7 instructions + security features

scripts/
├── deploy.ts                       # Initialize stablecoin on-chain
├── mint-rusd-to-user.ts            # Admin minting
├── add-metadata.ts                 # Legacy metadata
└── create-metadata-via-program.ts  # Metaplex integration

tests/
└── solana-stablecoin.ts            # Comprehensive test suite
```

### Robot API (`/robot-api`)
```
main.py                             # FastAPI server (port 8001)
handler_brazo_robotico.py          # Arduino serial communication
camera.py                           # OpenCV MJPEG streaming
dependencies.py                     # API key auth
config.py                           # Settings
rutinas-movimiento.csv             # Chess movement coordinates
```

## API Routes Reference

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login (returns JWT)

### Robot Management
- `GET /api/robots` - List available robots
- `POST /api/robots` - Create robot (robot_owner/admin)
- `GET /api/robots/{id}` - Robot details
- `PUT /api/robots/{id}` - Update robot (owner/admin)
- `DELETE /api/robots/{id}` - Delete robot (owner/admin)
- `POST /api/robots/explore-api` - Generate AI control interface
- `GET /api/robots/{id}/metrics` - Usage statistics

### Payments & Execution
- `POST /api/execute/{robot_id}` - Execute robot (returns 402 or result)
- `POST /api/payments/verify` - Verify blockchain transaction
- `GET /api/payments/session/{session_id}` - Session status

### Robot Hardware API (Port 8001)
- `POST /api/robot/move` - Execute robotic arm movement
- `GET /api/robot/stream` - MJPEG video stream
- `GET /` - Health check

## Deployment Checklist

### Development Environment
```bash
# 1. Start PostgreSQL
brew services start postgresql@15  # Mac
sudo systemctl start postgresql    # Linux

# 2. Create database
createdb x402_platform

# 3. Start Redis
redis-server
# Or: docker run -d -p 6379:6379 redis:latest

# 4. Backend
cd backend
pip install -r requirements.txt
alembic upgrade head  # Run migrations
uvicorn app.main:app --reload --port 8000

# 5. Frontend
cd frontend
npm install
npm run dev

# 6. Solana (if testing blockchain)
cd solana-engine
yarn install
anchor build
anchor deploy --provider.cluster devnet
ts-node scripts/deploy.ts

# 7. Robot API (if testing hardware)
cd robot-api
pip install -r requirements.txt
python main.py
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/docs
- Robot API: http://localhost:8001

### Verification
```bash
# Test backend
curl http://localhost:8000/api/robots

# Test Redis
redis-cli ping  # Should return PONG

# Test PostgreSQL
psql -U postgres -d x402_platform -c "\dt"

# Check Solana config
solana config get
solana balance

# Test robot API
curl http://localhost:8001/
```

## Additional Notes

- **Token Mint:** Current rUSD mint is `8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX` (devnet)
- **Program ID:** Current stablecoin program is `9LSXCUkD7BD3wjWjtC18qbrPAcfwdo4LVCER8j6CKEDj` (devnet)
- **Migration Strategy:** Database uses Alembic - always create migrations before schema changes
- **Testing Wallets:** Use Phantom or Solflare with devnet enabled
- **Video Streaming:** Robot API streams MJPEG on `/api/robot/stream` endpoint
- **GPS Support:** Robots can have GPS coordinates for location-based services
- **Rate Limiting:** Consider implementing rate limiting on execute endpoints for production
- **WebSocket Support:** Backend has WebSocket capability for real-time payment status (optional feature)

## Important Files to Understand the System

Read in this order for fastest onboarding:

1. `/backend/app/main.py` - Backend entry point, routing
2. `/backend/app/core/x402.py` - Core payment protocol logic
3. `/backend/app/api/routes/execute.py` - Main x402 payment flow
4. `/frontend/lib/api/client.ts` - Frontend Axios interceptor
5. `/frontend/components/payment/RobotPaymentModal.tsx` - Payment UI
6. `/solana-engine/programs/solana-stablecoin/src/lib.rs` - Smart contract
7. `/backend/app/models/robot.py` - Robot data model with interface_config
8. `/frontend/components/robot-controls/DynamicControl.tsx` - AI-powered controls

## 📄 License

MIT
