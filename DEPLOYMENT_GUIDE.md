# Guía de Deployment - Plataforma x402

## 📋 Requisitos Previos

### Backend
- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Solana CLI (para devnet)

### Frontend
- Node.js 18+
- npm o yarn

### General
- Wallet de Solana (Phantom, Solflare)
- SOL en devnet para pruebas

---

## 🚀 Deployment del Backend (FastAPI)

### 1. Navegar al directorio del backend

```bash
cd backend
```

### 2. Crear entorno virtual

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo:

```bash
copy .env.example .env   # Windows
cp .env.example .env     # Linux/Mac
```

Edita el archivo `.env`:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/x402_platform
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=tu-clave-secreta-super-segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
STABLECOIN_MINT=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

SESSION_EXPIRE_MINUTES=15
```

### 5. Configurar PostgreSQL

```bash
# Crear la base de datos
createdb x402_platform

# O usando psql:
psql -U postgres
CREATE DATABASE x402_platform;
```

### 6. Iniciar Redis

```bash
# Windows (si instalaste Redis)
redis-server

# Linux/Mac
redis-server

# O usando Docker
docker run -d -p 6379:6379 redis:latest
```

### 7. Ejecutar el servidor

```bash
# Modo desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# O usando Python directamente
python -m app.main
```

El backend estará disponible en: `http://localhost:8000`
Documentación API (Swagger): `http://localhost:8000/docs`

---

## 🎨 Deployment del Frontend (Next.js)

### 1. Navegar al directorio del frontend

```bash
cd frontend
```

### 2. Instalar dependencias

```bash
npm install
# o
yarn install
```

### 3. Configurar variables de entorno

```bash
copy .env.local.example .env.local   # Windows
cp .env.local.example .env.local     # Linux/Mac
```

Edita el archivo `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
```

### 4. Ejecutar el servidor de desarrollo

```bash
npm run dev
# o
yarn dev
```

El frontend estará disponible en: `http://localhost:3000`

### 5. Build para producción

```bash
npm run build
npm start

# o
yarn build
yarn start
```

---

## 🔧 Configuración de Solana Devnet

### 1. Instalar Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 2. Configurar para devnet

```bash
solana config set --url devnet
```

### 3. Crear wallet (si no tienes una)

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

### 4. Obtener SOL de devnet

```bash
solana airdrop 2
```

### 5. Verificar balance

```bash
solana balance
```

---

## 🎯 Flujo de Prueba Completo

### 1. Registrar un usuario

```bash
POST http://localhost:8000/api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

### 2. Login

```bash
POST http://localhost:8000/api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

Guarda el `access_token` recibido.

### 3. Registrar un robot (como robot_owner)

Primero crea un usuario con rol `robot_owner`:

```bash
POST http://localhost:8000/api/auth/register
{
  "email": "robotowner@example.com",
  "password": "password123",
  "role": "robot_owner",
  "wallet_address": "TU_WALLET_ADDRESS_SOLANA"
}
```

Luego crea un robot:

```bash
POST http://localhost:8000/api/robots
Authorization: Bearer YOUR_TOKEN
{
  "name": "Image Generator Bot",
  "description": "Generates images using AI",
  "price": 0.1,
  "wallet_address": "TU_WALLET_ADDRESS",
  "services": ["image-generation", "ai"],
  "endpoint": "https://your-robot-service.com/execute"
}
```

### 4. Listar robots

```bash
GET http://localhost:8000/api/robots
Authorization: Bearer YOUR_TOKEN
```

### 5. Ejecutar un robot (activará x402)

```bash
POST http://localhost:8000/api/execute/{robot_id}
Authorization: Bearer YOUR_TOKEN
{
  "service": "image-generation",
  "parameters": {
    "prompt": "A beautiful sunset"
  }
}
```

Esto devolverá un **402 Payment Required** con los datos de pago.

### 6. Pagar en Solana

Usa el modal de pago en el frontend o:

```typescript
// Ejecuta el pago desde el frontend
const signature = await executePayment({
  recipient: paymentData.recipient,
  amount: paymentData.amount,
  memo: paymentData.session_id,
  connection,
  publicKey,
  signTransaction
});
```

### 7. Verificar pago

```bash
POST http://localhost:8000/api/payments/verify
Authorization: Bearer YOUR_TOKEN
{
  "session_id": "SESSION_ID_FROM_402",
  "tx_signature": "TRANSACTION_SIGNATURE"
}
```

### 8. Re-ejecutar con session_id

```bash
POST http://localhost:8000/api/execute/{robot_id}
Authorization: Bearer YOUR_TOKEN
X-Session-ID: VERIFIED_SESSION_ID
{
  "service": "image-generation",
  "parameters": {
    "prompt": "A beautiful sunset"
  }
}
```

Ahora devolverá el resultado del robot.

---

## 📊 Estructura de Base de Datos

Las tablas se crean automáticamente al iniciar el backend, pero puedes verificar:

```sql
-- Verificar tablas
\dt

-- Ver usuarios
SELECT * FROM users;

-- Ver robots
SELECT * FROM robots;

-- Ver sesiones de pago
SELECT * FROM payment_sessions;

-- Ver logs de ejecución
SELECT * FROM execution_logs;
```

---

## 🔐 Crear Usuario Admin

Para crear un usuario administrador, regístralo con rol `admin`:

```bash
POST http://localhost:8000/api/auth/register
{
  "email": "admin@example.com",
  "password": "admin123",
  "role": "admin"
}
```

---

## 🐛 Troubleshooting

### Error: "Could not connect to Redis"

```bash
# Verifica que Redis esté corriendo
redis-cli ping
# Debe responder: PONG
```

### Error: "Database connection failed"

```bash
# Verifica PostgreSQL
psql -U postgres -d x402_platform
# Si no existe, créala
createdb x402_platform
```

### Error: "Transaction verification failed"

- Verifica que usaste el `memo` correcto (session_id)
- Asegúrate de que el monto sea exacto
- Verifica que la transacción esté confirmada en devnet
- Usa Solana Explorer para verificar: `https://explorer.solana.com/?cluster=devnet`

### Error: "402 loop infinito"

- Limpia el localStorage del navegador
- Verifica que el session_id se esté pasando en los headers
- Revisa la consola del navegador para errores

---

## 🎭 Mock Robot para Testing

Puedes crear un mock robot endpoint para testing:

```python
# mock_robot.py
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.post("/execute")
async def execute(data: dict):
    return {
        "status": "success",
        "result": f"Processed: {data.get('parameters', {}).get('prompt', 'N/A')}",
        "timestamp": "2024-01-01T00:00:00Z"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

Luego usa `http://localhost:8001/execute` como endpoint del robot.

---

## 📦 Docker Deployment (Opcional)

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: x402_platform
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/x402_platform
      REDIS_URL: redis://redis:6379/0

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000/api

volumes:
  postgres_data:
```

Ejecutar:

```bash
docker-compose up -d
```

---

## 🌐 Deployment en Producción

### Backend (Render, Railway, Fly.io)

1. Crea cuenta en Render/Railway
2. Conecta tu repositorio GitHub
3. Configura las variables de entorno
4. Deploy automático desde main branch

### Frontend (Vercel, Netlify)

1. Crea cuenta en Vercel
2. Importa tu repositorio
3. Configura variables de entorno
4. Deploy automático

### Base de Datos

- PostgreSQL: Neon, Supabase, Railway
- Redis: Upstash, Redis Cloud

---

## ✅ Checklist de Deployment

- [ ] PostgreSQL configurado y corriendo
- [ ] Redis configurado y corriendo
- [ ] Backend corriendo en http://localhost:8000
- [ ] Frontend corriendo en http://localhost:3000
- [ ] Wallet de Solana configurada
- [ ] SOL en devnet para pruebas
- [ ] Usuario registrado y con token
- [ ] Robot creado y activo
- [ ] Pago de prueba exitoso
- [ ] Ejecución de robot funcionando

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs del backend
2. Revisa la consola del navegador
3. Verifica las transacciones en Solana Explorer
4. Asegúrate de que todos los servicios estén corriendo

---

¡Listo! Tu plataforma x402 debería estar funcionando completamente. 🎉
