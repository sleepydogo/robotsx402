# rUSD Token Metadata Setup

Este documento explica cómo agregar metadata (nombre, símbolo, logo, descripción) a tu stablecoin rUSD.

## 📋 Opciones de Configuración

### Nombre del Token (elegir una)

En `scripts/add-metadata.ts`, descomenta la opción que prefieras:

```typescript
const TOKEN_NAME = "Robot USD";           // ✅ RECOMENDADO: Simple y profesional
// const TOKEN_NAME = "rUSD";              // Minimalista (solo ticker)
// const TOKEN_NAME = "Robot IoT Dollar";  // Descriptivo completo
// const TOKEN_NAME = "Quantum Robot USD"; // Incluye marca "Quantum"
```

### Descripción (elegir una)

```typescript
// Opción 1 - Técnica y concisa (RECOMENDADO)
const TOKEN_DESCRIPTION = "Stablecoin designed for robot and IoT service payments on the x402 protocol";

// Opción 2 - Enfoque descentralizado
// const TOKEN_DESCRIPTION = "A decentralized stablecoin for robot hiring and IoT device payments";

// Opción 3 - Marketing enfocado
// const TOKEN_DESCRIPTION = "rUSD: The payment standard for automated robot services and IoT infrastructure";

// Opción 4 - Más técnica
// const TOKEN_DESCRIPTION = "Blockchain-powered stablecoin enabling seamless payments for robot execution and IoT operations";
```

### Símbolo/Ticker

```typescript
const TOKEN_SYMBOL = "rUSD";  // ✅ Ya definido, no cambiar
```

## 🎨 Configuración del Logo

### Opción A: Usar un servicio de hosting (RECOMENDADO)

**1. Arweave (permanente y descentralizado)**

```bash
# Instalar CLI de Arweave
npm install -g @irys/cli

# Subir imagen (cuesta ~$0.001)
irys upload logo.png -h https://node1.irys.xyz -t solana -w ~/.config/solana/id.json

# Te dará una URL como:
# https://arweave.net/abc123...
```

**2. IPFS con Pinata**

1. Crea cuenta en [pinata.cloud](https://pinata.cloud) (gratis)
2. Sube `logo.png` desde la interfaz web
3. Copia el CID, URL será: `https://gateway.pinata.cloud/ipfs/TU_CID`

**3. GitHub (gratis, simple)**

1. Sube `logo.png` a un repositorio público
2. URL será: `https://raw.githubusercontent.com/USUARIO/REPO/main/logo.png`

### Opción B: Crear logo genérico temporalmente

Si aún no tienes logo, puedes usar placeholders:

- `https://via.placeholder.com/500x500.png?text=rUSD`
- `https://ui-avatars.com/api/?name=rUSD&size=500&background=random`

## 📝 Actualizar metadata.json

Edita `/Users/tom/solana-quantum/solana-engine/metadata.json`:

```json
{
  "name": "Robot USD",
  "symbol": "rUSD",
  "description": "Stablecoin designed for robot and IoT service payments on the x402 protocol",
  "image": "https://arweave.net/TU_URL_DE_LOGO",  // ← Cambia esto
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Stablecoin"
    },
    {
      "trait_type": "Use Case",
      "value": "Robot & IoT Payments"
    },
    {
      "trait_type": "Protocol",
      "value": "x402"
    }
  ]
}
```

### Subir metadata.json

Sube también el `metadata.json` a Arweave/IPFS:

```bash
# Con Arweave
irys upload metadata.json -h https://node1.irys.xyz -t solana -w ~/.config/solana/id.json

# Copia la URL resultante, ejemplo:
# https://arweave.net/xyz789...
```

## 🚀 Pasos de Deployment

### 1. Deploy del programa y mint

```bash
cd /Users/tom/solana-quantum/solana-engine

# Build y deploy
anchor build
anchor deploy --provider.cluster devnet

# Inicializar stablecoin
ts-node scripts/deploy.ts
```

**⚠️ IMPORTANTE:** Copia la dirección del **Mint** que aparece en la salida.

### 2. Configurar add-metadata.ts

Edita `scripts/add-metadata.ts`:

```typescript
// Pega la dirección del mint aquí
const MINT_ADDRESS = "8x3f...abc123";  // De deploy.ts

// Pega la URL del metadata.json
const METADATA_URI = "https://arweave.net/xyz789...";
```

### 3. Agregar metadata

```bash
ts-node scripts/add-metadata.ts
```

Verás:

```
🎨 Adding metadata to token...
Mint: 8x3f...abc123
Name: Robot USD
Symbol: rUSD
...
✅ Metadata added successfully!
```

### 4. Verificar en Solana Explorer

Abre el link que aparece:
```
https://explorer.solana.com/address/TU_MINT?cluster=devnet
```

Deberías ver:
- ✅ Nombre: "Robot USD"
- ✅ Símbolo: "rUSD"
- ✅ Logo visible
- ✅ Descripción

## 🔄 Actualizar Metadata Existente

Si ya agregaste metadata y quieres cambiarla:

```bash
# Crear update-metadata.ts (script separado)
# Usar updateMetadataAccountV2 en lugar de createMetadataAccountV3
```

## 🎯 Recomendaciones de Diseño del Logo

Para el logo de rUSD:

**Conceptos:**
- Robot + Dólar ($)
- Engranajes + Blockchain
- IoT iconography (circuitos, señales)
- Colores: Azul tecnológico, verde (USD), gris metálico

**Especificaciones técnicas:**
- Formato: PNG con transparencia
- Tamaño: 500x500px mínimo (recomendado 1000x1000px)
- Fondo: Transparente o sólido
- Peso: <200KB

**Herramientas para crear:**
- Canva (gratis, templates)
- Figma (profesional)
- DALL-E / Midjourney (AI)
- Stable Diffusion (local)

## 📚 Descripción Final Recomendada

Considerando que es para contratación de robots IoT:

```
"rUSD is a stablecoin designed for automated robot and IoT service payments on the x402 protocol. Enables seamless, pay-per-use transactions for robotic execution and device control."
```

Incluye:
✅ Qué es (stablecoin)
✅ Para qué sirve (robot/IoT payments)
✅ Protocolo específico (x402)
✅ Beneficio clave (seamless, pay-per-use)

## ❓ Troubleshooting

**Error: "already in use"**
- El mint ya tiene metadata
- Usa `updateMetadataAccountV2` en lugar de `createMetadataAccountV3`

**Logo no aparece**
- Verifica que la URL sea accesible públicamente
- Debe ser HTTPS, no HTTP
- El servidor debe permitir CORS

**Transaction failed**
- Verifica que tienes SOL suficiente en devnet
- `solana airdrop 2`

**URI inválida**
- Asegúrate que metadata.json sea válido (usa jsonlint.com)
- La URL debe apuntar al JSON, no al logo directamente

## 📞 Próximos Pasos

1. ✅ Elige nombre y descripción
2. ✅ Crea/sube logo a Arweave/IPFS
3. ✅ Actualiza metadata.json con URL del logo
4. ✅ Sube metadata.json a Arweave/IPFS
5. ✅ Ejecuta add-metadata.ts
6. ✅ Verifica en Explorer
7. ✅ Actualiza backend `.env` con mint address
