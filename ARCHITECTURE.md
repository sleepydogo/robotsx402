# Arquitectura Técnica - Plataforma x402 Payment Protocol

## 🏗️ Visión General

Sistema de pagos automatizados donde usuarios/agentes pagan a robots por servicios usando el protocolo HTTP 402 Payment Required (x402).

### Stack Tecnológico
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python), Pydantic, SQLAlchemy
- **Blockchain**: Solana (devnet), Web3.js, Solana Pay
- **Database**: PostgreSQL
- **Cache**: Redis (para sesiones de pago)

---

## 📐 Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ User Portal  │  │ Robot Portal │  │ Admin Portal │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                 │                 │              │
│           └─────────────────┴─────────────────┘              │
│                          │                                   │
│                   ┌──────▼──────┐                           │
│                   │ x402 Handler │                           │
│                   │ Wallet Mgmt  │                           │
│                   └──────────────┘                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                      BACKEND (FastAPI)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ x402 Module  │  │   Payment    │  │    Robot     │      │
│  │              │  │  Verifier    │  │   Registry   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │    Session   │  │   Executor   │      │
│  │   & Roles    │  │   Manager    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   BLOCKCHAIN LAYER (Solana)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Payment    │  │ Transaction  │  │  Stablecoin  │      │
│  │  Verification│  │   Monitor    │  │   Contract   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔴 BACKEND (FastAPI)

### Estructura de Directorios

```
backend/
├── app/
│   ├── main.py                    # Entry point
│   ├── config.py                  # Configuración global
│   ├── database.py                # DB setup
│   │
│   ├── core/
│   │   ├── x402.py               # Módulo x402 protocol
│   │   ├── security.py           # JWT, hashing, roles
│   │   ├── blockchain.py         # Solana integration
│   │   └── session.py            # Session manager (Redis)
│   │
│   ├── models/
│   │   ├── user.py               # User model
│   │   ├── robot.py              # Robot model
│   │   ├── payment.py            # Payment model
│   │   └── session.py            # PaymentSession model
│   │
│   ├── schemas/
│   │   ├── x402.py               # x402 response schemas
│   │   ├── payment.py            # Payment schemas
│   │   ├── robot.py              # Robot schemas
│   │   └── user.py               # User schemas
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py           # Login, register
│   │   │   ├── robots.py         # Robot CRUD, discovery
│   │   │   ├── payments.py       # Payment verification
│   │   │   ├── execute.py        # Robot execution (402 gated)
│   │   │   └── admin.py          # Admin endpoints
│   │   │
│   │   └── dependencies.py       # Auth, role checks
│   │
│   ├── services/
│   │   ├── payment_verifier.py   # On-chain verification
│   │   ├── robot_executor.py     # Execute robot tasks
│   │   ├── x402_generator.py     # Generate 402 responses
│   │   └── metrics.py            # Usage tracking
│   │
│   └── utils/
│       ├── solana.py             # Solana helpers
│       └── validators.py         # Custom validators
│
├── tests/
├── requirements.txt
└── .env
```

### Core Modules

#### 1. **x402.py** - Protocolo x402

```python
# Estructura de respuesta x402
class X402Response:
    status_code: 402
    headers: {
        "X-Payment-Required": "true",
        "X-Payment-Amount": str,
        "X-Payment-Currency": "USDC",
        "X-Payment-Network": "solana-devnet",
        "X-Payment-Address": str,
        "X-Session-ID": str,
        "X-Payment-Memo": str  # Para identificar pago
    }
    body: {
        "error": "Payment Required",
        "session_id": str,
        "amount": float,
        "currency": "USDC",
        "network": "solana-devnet",
        "recipient": str,
        "expires_at": datetime,
        "service": str,
        "robot_id": str
    }
```

**Funciones clave:**
- `generate_x402_response()` - Crea respuesta 402 estándar
- `create_payment_session()` - Genera sesión única en Redis
- `validate_session()` - Verifica validez de sesión

#### 2. **blockchain.py** - Verificación On-Chain

```python
class SolanaPaymentVerifier:
    async def verify_transaction(
        signature: str,
        expected_amount: float,
        recipient: str,
        memo: str
    ) -> bool

    async def get_transaction_status(signature: str)

    async def monitor_payment(session_id: str) -> Transaction
```

**Proceso:**
1. Cliente envía signature de transacción
2. Backend consulta Solana RPC
3. Verifica: amount, recipient, memo, confirmations
4. Actualiza sesión en Redis
5. Libera acceso si válido

#### 3. **session.py** - Gestión de Sesiones

```python
class PaymentSessionManager:
    redis_client: Redis

    async def create_session(
        user_id: str,
        robot_id: str,
        amount: float,
        service: str
    ) -> str  # session_id

    async def get_session(session_id: str) -> PaymentSession

    async def mark_paid(session_id: str, tx_signature: str)

    async def is_session_paid(session_id: str) -> bool
```

**Campos de sesión:**
- `session_id`: UUID
- `user_id`: ID del usuario
- `robot_id`: ID del robot
- `amount`: Monto a pagar
- `status`: pending | paid | expired
- `tx_signature`: Firma de transacción
- `created_at`, `expires_at`

### API Endpoints

#### **POST /api/execute/{robot_id}**
Endpoint principal que devuelve 402 si no hay pago

```python
@router.post("/execute/{robot_id}")
async def execute_robot(
    robot_id: str,
    payload: ExecutePayload,
    session_id: Optional[str] = Header(None),
    user = Depends(get_current_user)
):
    # 1. Verificar si existe sesión pagada
    if session_id:
        session = await session_manager.get_session(session_id)
        if session and session.status == "paid":
            # Ejecutar robot
            result = await robot_executor.execute(robot_id, payload)
            return {"success": true, "data": result}

    # 2. Si no hay pago, generar 402
    robot = await get_robot(robot_id)
    session = await session_manager.create_session(
        user.id, robot_id, robot.price, payload.service
    )

    return X402Response(
        session_id=session.id,
        amount=robot.price,
        recipient=robot.wallet_address,
        ...
    )
```

#### **POST /api/payments/verify**
Verifica pago on-chain

```python
@router.post("/payments/verify")
async def verify_payment(
    data: PaymentVerification,
    user = Depends(get_current_user)
):
    # Verificar transacción en blockchain
    is_valid = await payment_verifier.verify_transaction(
        signature=data.tx_signature,
        expected_amount=session.amount,
        recipient=session.recipient,
        memo=session.id
    )

    if is_valid:
        await session_manager.mark_paid(session.id, data.tx_signature)
        return {"verified": true, "session_id": session.id}

    return {"verified": false, "error": "Invalid transaction"}
```

#### **GET /api/robots**
Lista robots disponibles

```python
@router.get("/robots")
async def list_robots(
    category: Optional[str] = None,
    user = Depends(get_current_user)
):
    robots = await robot_service.get_available_robots(category)
    return {
        "robots": [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "price": r.price,
                "currency": "USDC",
                "services": r.services,
                "metrics": {
                    "total_executions": r.execution_count,
                    "avg_response_time": r.avg_response_time,
                    "success_rate": r.success_rate
                }
            }
            for r in robots
        ]
    }
```

#### **POST /api/robots** (Admin/Robot Owner)
Registrar nuevo robot

```python
@router.post("/robots")
async def register_robot(
    robot: RobotCreate,
    user = Depends(require_role("admin", "robot_owner"))
):
    new_robot = await robot_service.create_robot(
        owner_id=user.id,
        name=robot.name,
        price=robot.price,
        wallet_address=robot.wallet_address,
        services=robot.services,
        endpoint=robot.endpoint  # Donde se ejecuta el robot
    )
    return new_robot
```

### Models

#### **Robot Model**
```python
class Robot(Base):
    id: UUID
    owner_id: UUID
    name: str
    description: str
    price: Decimal
    currency: str = "USDC"
    wallet_address: str
    services: List[str]  # ["text-to-image", "data-analysis"]
    endpoint: str  # URL del servicio del robot
    status: str  # "active" | "inactive" | "maintenance"
    execution_count: int
    total_revenue: Decimal
    avg_response_time: float
    success_rate: float
    created_at: datetime
```

#### **PaymentSession Model**
```python
class PaymentSession(Base):
    id: UUID  # session_id
    user_id: UUID
    robot_id: UUID
    amount: Decimal
    currency: str
    recipient_address: str
    status: str  # "pending" | "paid" | "expired"
    tx_signature: Optional[str]
    service_payload: JSON
    created_at: datetime
    expires_at: datetime
    paid_at: Optional[datetime]
```

#### **User Model**
```python
class User(Base):
    id: UUID
    email: str
    role: str  # "user" | "robot_owner" | "admin"
    wallet_address: Optional[str]
    total_spent: Decimal
    created_at: datetime
```

### Role System

```python
# core/security.py
def require_role(*roles):
    def decorator(func):
        async def wrapper(user = Depends(get_current_user)):
            if user.role not in roles:
                raise HTTPException(403, "Insufficient permissions")
            return await func(user)
        return wrapper
    return decorator

# Uso:
@router.post("/robots")
async def create_robot(user = Depends(require_role("admin", "robot_owner"))):
    ...
```

---

## 🟢 FRONTEND (Next.js)

### Estructura de Directorios

```
frontend/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── robots/
│   │   ├── page.tsx              # Lista de robots
│   │   └── [id]/page.tsx         # Detalle + ejecución
│   ├── dashboard/
│   │   ├── page.tsx              # User dashboard
│   │   └── robots/               # Robot owner panel
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   └── admin/
│       └── page.tsx
│
├── components/
│   ├── x402/
│   │   ├── PaymentModal.tsx      # Modal de pago 402
│   │   ├── PaymentHandler.tsx    # Detector 402
│   │   └── PaymentStatus.tsx     # Status de pago
│   ├── wallet/
│   │   ├── WalletConnect.tsx     # Conexión de wallet
│   │   └── WalletProvider.tsx    # Context provider
│   ├── robots/
│   │   ├── RobotCard.tsx
│   │   ├── RobotList.tsx
│   │   ├── ExecuteRobotForm.tsx
│   │   └── RobotMetrics.tsx
│   └── ui/
│       └── ...                   # Componentes base
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # Axios con x402 interceptor
│   │   ├── robots.ts             # Robot endpoints
│   │   ├── payments.ts           # Payment endpoints
│   │   └── auth.ts               # Auth endpoints
│   ├── x402/
│   │   ├── handler.ts            # Lógica x402
│   │   ├── parser.ts             # Parse headers 402
│   │   └── retry.ts              # Auto-retry post-pago
│   ├── blockchain/
│   │   ├── solana.ts             # Solana helpers
│   │   ├── payment.ts            # Payment execution
│   │   └── verify.ts             # Client-side verify
│   └── hooks/
│       ├── useWallet.ts
│       ├── usePayment.ts
│       ├── useRobots.ts
│       └── useX402.ts
│
├── types/
│   ├── x402.ts
│   ├── robot.ts
│   └── payment.ts
│
└── contexts/
    ├── WalletContext.tsx
    └── AuthContext.tsx
```

### Core Components

#### **1. x402 API Client con Interceptor**

```typescript
// lib/api/client.ts
import axios from 'axios';
import { handleX402Response } from '../x402/handler';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Interceptor que detecta 402
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 402) {
      // Extraer datos del 402
      const paymentData = parseX402Response(error.response);

      // Mostrar modal de pago
      const paid = await handleX402Response(paymentData);

      if (paid) {
        // Reintentar request original con session_id
        const originalRequest = error.config;
        originalRequest.headers['X-Session-ID'] = paymentData.session_id;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
```

#### **2. x402 Handler**

```typescript
// lib/x402/handler.ts
export interface X402Data {
  session_id: string;
  amount: number;
  currency: string;
  network: string;
  recipient: string;
  service: string;
  robot_id: string;
  expires_at: string;
}

export function parseX402Response(response: any): X402Data {
  return {
    session_id: response.headers['x-session-id'],
    amount: parseFloat(response.headers['x-payment-amount']),
    currency: response.headers['x-payment-currency'],
    network: response.headers['x-payment-network'],
    recipient: response.headers['x-payment-address'],
    ...response.data
  };
}

export async function handleX402Response(
  data: X402Data
): Promise<boolean> {
  return new Promise((resolve) => {
    // Abrir modal de pago
    window.dispatchEvent(
      new CustomEvent('x402-payment-required', { detail: data })
    );

    // Escuchar cuando se complete el pago
    const handlePaid = () => {
      resolve(true);
      window.removeEventListener('x402-payment-completed', handlePaid);
    };

    window.addEventListener('x402-payment-completed', handlePaid);
  });
}
```

#### **3. Payment Modal Component**

```typescript
// components/x402/PaymentModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/lib/hooks/useWallet';
import { executePayment } from '@/lib/blockchain/payment';
import { verifyPayment } from '@/lib/api/payments';

export function PaymentModal() {
  const [paymentData, setPaymentData] = useState<X402Data | null>(null);
  const [status, setStatus] = useState<'idle' | 'paying' | 'verifying' | 'success'>('idle');
  const { wallet, connected } = useWallet();

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setPaymentData(e.detail);
      setStatus('idle');
    };

    window.addEventListener('x402-payment-required', handler);
    return () => window.removeEventListener('x402-payment-required', handler);
  }, []);

  const handlePay = async () => {
    if (!connected || !paymentData) return;

    try {
      setStatus('paying');

      // Ejecutar pago en Solana
      const signature = await executePayment({
        recipient: paymentData.recipient,
        amount: paymentData.amount,
        memo: paymentData.session_id,
      });

      setStatus('verifying');

      // Verificar en backend
      const verified = await verifyPayment({
        session_id: paymentData.session_id,
        tx_signature: signature,
      });

      if (verified) {
        setStatus('success');

        // Notificar que el pago fue exitoso
        window.dispatchEvent(new CustomEvent('x402-payment-completed'));

        setTimeout(() => setPaymentData(null), 2000);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setStatus('idle');
    }
  };

  return (
    <AnimatePresence>
      {paymentData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold mb-4">Payment Required</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Service</span>
                <span className="font-medium">{paymentData.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-bold text-xl">
                  {paymentData.amount} {paymentData.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Network</span>
                <span>{paymentData.network}</span>
              </div>
            </div>

            {!connected ? (
              <button className="w-full btn-primary">
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={handlePay}
                disabled={status !== 'idle'}
                className="w-full btn-primary"
              >
                {status === 'idle' && 'Pay Now'}
                {status === 'paying' && 'Processing Payment...'}
                {status === 'verifying' && 'Verifying...'}
                {status === 'success' && '✓ Payment Confirmed'}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### **4. Robot Execution Component**

```typescript
// components/robots/ExecuteRobotForm.tsx
'use client';

import { useState } from 'react';
import { executeRobot } from '@/lib/api/robots';

export function ExecuteRobotForm({ robot }: { robot: Robot }) {
  const [payload, setPayload] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    setLoading(true);
    try {
      // Este call puede devolver 402 y activar el flow de pago
      const response = await executeRobot(robot.id, payload);
      setResult(response.data);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Service Parameters</h3>
        {/* Form fields para el payload */}
      </div>

      <button
        onClick={handleExecute}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Processing...' : `Execute (${robot.price} USDC)`}
      </button>

      {result && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="font-semibold mb-2">Result</h4>
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

#### **5. Wallet Provider**

```typescript
// components/wallet/WalletProvider.tsx
'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

### Flujo de Ejecución Completo

```typescript
// lib/api/robots.ts
export async function executeRobot(robotId: string, payload: any) {
  // 1. Request al backend
  const response = await apiClient.post(`/api/execute/${robotId}`, payload);

  // Si devuelve 402:
  //   - Interceptor detecta el 402
  //   - Extrae datos de pago
  //   - Muestra PaymentModal
  //   - Usuario paga
  //   - Verifica pago
  //   - Auto-retry con session_id
  //   - Devuelve resultado

  return response;
}
```

---

## 🔗 BLOCKCHAIN LAYER

### Solana Integration

#### Payment Execution
```typescript
// lib/blockchain/payment.ts
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

export async function executePayment({
  recipient,
  amount,
  memo,
}: PaymentParams): Promise<string> {
  const { publicKey, signTransaction } = useWallet();
  const connection = new Connection(clusterApiUrl('devnet'));

  // Crear transacción
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(recipient),
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  // Agregar memo para identificación
  transaction.add(
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    })
  );

  // Firmar y enviar
  const signed = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  // Esperar confirmación
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}
```

#### Backend Verification
```python
# services/payment_verifier.py
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed

class SolanaPaymentVerifier:
    def __init__(self):
        self.client = AsyncClient("https://api.devnet.solana.com")

    async def verify_transaction(
        self,
        signature: str,
        expected_amount: float,
        recipient: str,
        memo: str
    ) -> bool:
        # Obtener transacción
        tx = await self.client.get_transaction(signature, commitment=Confirmed)

        if not tx or not tx.value:
            return False

        # Verificar destinatario
        transfer_instruction = tx.value.transaction.transaction.instructions[0]
        actual_recipient = str(transfer_instruction.accounts[1])

        if actual_recipient != recipient:
            return False

        # Verificar monto
        actual_amount = transfer_instruction.data
        if actual_amount != expected_amount:
            return False

        # Verificar memo
        memo_instruction = tx.value.transaction.transaction.instructions[1]
        actual_memo = memo_instruction.data.decode('utf-8')

        if actual_memo != memo:
            return False

        return True
```

---

## 📊 DATABASE SCHEMA

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    wallet_address VARCHAR(255),
    total_spent DECIMAL(20, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Robots
CREATE TABLE robots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    wallet_address VARCHAR(255) NOT NULL,
    services JSONB NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    execution_count INT DEFAULT 0,
    total_revenue DECIMAL(20, 6) DEFAULT 0,
    avg_response_time FLOAT DEFAULT 0,
    success_rate FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Sessions (también en Redis para rapidez)
CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    robot_id UUID REFERENCES robots(id),
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    recipient_address VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    tx_signature VARCHAR(255),
    service_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP
);

-- Execution Logs
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES payment_sessions(id),
    robot_id UUID REFERENCES robots(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50),
    response_time FLOAT,
    error TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user ON payment_sessions(user_id);
CREATE INDEX idx_sessions_robot ON payment_sessions(robot_id);
CREATE INDEX idx_sessions_status ON payment_sessions(status);
CREATE INDEX idx_robots_owner ON robots(owner_id);
```

---

## 🔄 FLUJOS DE TRABAJO

### 1. Flujo de Registro de Robot

```
Robot Owner → POST /api/robots
  ↓
Backend valida role = "robot_owner" | "admin"
  ↓
Crea registro en DB
  ↓
Retorna robot_id y configuración
```

### 2. Flujo de Ejecución con Pago

```
1. User → POST /api/execute/{robot_id} + payload
   ↓
2. Backend verifica si existe session_id en headers
   ↓ (no existe)
3. Backend genera PaymentSession
   ↓
4. Backend retorna 402 con headers x402
   ↓
5. Frontend interceptor detecta 402
   ↓
6. Frontend muestra PaymentModal
   ↓
7. User conecta wallet y paga
   ↓
8. Frontend envía tx_signature a POST /api/payments/verify
   ↓
9. Backend verifica on-chain
   ↓
10. Backend marca session como "paid"
   ↓
11. Frontend auto-retry POST /api/execute/{robot_id} + session_id
   ↓
12. Backend valida session paid
   ↓
13. Backend ejecuta robot (llama a robot.endpoint)
   ↓
14. Backend retorna resultado al frontend
   ↓
15. Frontend muestra resultado
```

### 3. Flujo de Monitoreo (Robot Owner)

```
Robot Owner → GET /api/robots/{robot_id}/metrics
  ↓
Backend retorna:
  - Total executions
  - Total revenue
  - Success rate
  - Avg response time
  - Recent payments
```

---

## 🔐 AUTENTICACIÓN Y ROLES

### JWT Authentication

```python
# core/security.py
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")

def verify_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    user = await get_user_by_id(payload["user_id"])
    return user
```

### Roles
- **user**: Puede ejecutar robots y pagar
- **robot_owner**: Puede crear y gestionar sus propios robots
- **admin**: Acceso completo

---

## ⚡ OPTIMIZACIONES

### 1. Redis Cache para Sesiones
```python
# Sesiones en Redis (TTL 15 minutos)
await redis.setex(
    f"session:{session_id}",
    900,  # 15 min
    json.dumps(session_data)
)
```

### 2. WebSocket para Status Real-time
```python
# Backend notifica cuando pago es confirmado
@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Esperar confirmación
    while True:
        session = await get_session(session_id)
        if session.status == "paid":
            await websocket.send_json({"status": "paid"})
            break
        await asyncio.sleep(1)
```

### 3. Rate Limiting
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/execute/{robot_id}")
@limiter.limit("10/minute")
async def execute_robot(...):
    ...
```

---

## 📦 ENVIRONMENT SETUP

### Backend .env
```bash
DATABASE_URL=postgresql://user:pass@localhost/x402_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
```

### Frontend .env.local
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

---

## 🚀 DEPLOYMENT

### Backend (FastAPI)
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Next.js)
```bash
npm run dev  # Development
npm run build && npm start  # Production
```

---

## 📝 RESUMEN DE COMPONENTES CLAVE

| Componente | Tecnología | Función |
|------------|-----------|---------|
| x402 Generator | FastAPI | Genera respuestas 402 estándar |
| Payment Verifier | Solana SDK | Verifica transacciones on-chain |
| Session Manager | Redis | Gestiona sesiones de pago |
| API Interceptor | Axios | Detecta 402 y activa flujo |
| Payment Modal | React + Framer | UI para ejecutar pagos |
| Wallet Provider | Solana Wallet Adapter | Conexión de wallets |
| Robot Executor | FastAPI | Ejecuta tareas de robots |
| Metrics Service | PostgreSQL | Tracking de uso y revenue |

---

Esta arquitectura está lista para implementar. ¿Quieres que comience a desarrollar algún módulo específico primero?
