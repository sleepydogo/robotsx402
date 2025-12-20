# rUSD Airdrop Web

Web simple para solicitar airdrops de 50 rUSD en Solana Devnet.

## 🚀 Inicio Rápido

### 1. Instalar dependencias de Python

```bash
cd airdrop-web
pip install -r requirements.txt
```

### 2. Asegurarse de que Solana está configurado

```bash
# Verificar que estás en devnet
solana config set --url devnet

# Verificar balance (necesitas SOL para pagar las transacciones)
solana balance

# Si necesitas SOL
solana airdrop 2
```

### 3. Verificar que el script de mint funciona

```bash
cd ../solana-engine
yarn install

# Probar mint (reemplaza con tu wallet)
ts-node scripts/mint-rusd-to-user.ts YOUR_WALLET_ADDRESS 10
```

### 4. Iniciar el servidor

```bash
cd ../airdrop-web
python server.py
```

El servidor estará disponible en:
- **Frontend:** http://localhost:8002/static/index.html
- **API:** http://localhost:8002/docs

## 📋 Características

- ✅ Conexión con wallet de Solana (Phantom, Solflare, etc.)
- ✅ Airdrop de 50 rUSD por solicitud
- ✅ Cooldown de 24 horas por wallet
- ✅ Verificación de balance en tiempo real
- ✅ UI simple y responsiva
- ✅ Solo funciona en Devnet

## 🔧 Configuración

### Variables en `app.js`:
```javascript
const BACKEND_URL = 'http://localhost:8002';
const MINT_ADDRESS = '8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX';
const RPC_URL = 'https://api.devnet.solana.com';
```

### Variables en `server.py`:
```python
AIRDROP_AMOUNT = 50  # rUSD per airdrop
COOLDOWN_HOURS = 24  # Hours between airdrops
```

## 📡 API Endpoints

### `POST /airdrop`
Solicitar airdrop de rUSD

**Request:**
```json
{
  "wallet_address": "8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX",
  "amount": 50
}
```

**Response:**
```json
{
  "success": true,
  "signature": "5j7s...",
  "amount": 50,
  "wallet_address": "8r2x...",
  "message": "Successfully airdropped 50 rUSD to your wallet!"
}
```

### `GET /history/{wallet_address}`
Verificar historial de airdrops

**Response:**
```json
{
  "wallet_address": "8r2x...",
  "last_airdrop": "2024-12-18T10:30:00",
  "can_request": false,
  "cooldown_remaining_hours": 12.5
}
```

## 🛠️ Archivos

- `index.html` - Frontend UI
- `app.js` - Lógica de conexión de wallet y solicitud de airdrop
- `styles.css` - Estilos
- `server.py` - Backend FastAPI que ejecuta el minting
- `requirements.txt` - Dependencias de Python

## ⚠️ Notas Importantes

- Solo funciona en **Solana Devnet**
- Requiere que tengas SOL en tu wallet authority para pagar las transacciones de mint
- El cooldown es en memoria - se reinicia cuando reinicias el servidor (usa Redis/DB para producción)
- Asegúrate de que el mint address en `app.js` coincide con tu token rUSD

## 🐛 Troubleshooting

**Error: "Failed to mint tokens"**
- Verifica que tienes SOL en tu wallet authority: `solana balance`
- Verifica que el program ID es correcto en `Anchor.toml`
- Verifica que el mint address es correcto

**Error: "Invalid wallet address"**
- Asegúrate de que tu wallet está conectada
- Verifica que la wallet es de Solana (32+ caracteres)

**Error: "Airdrop cooldown active"**
- Espera 24 horas desde el último airdrop
- O reinicia el servidor para resetear el cooldown (solo desarrollo)

## 📝 Licencia

MIT
