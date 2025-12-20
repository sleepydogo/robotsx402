# Solana Stablecoin

Una implementación completa de una stablecoin en Solana usando Anchor Framework, lista para desplegar en devnet.

## 🌟 Características

- **Mint/Burn**: Acuñar y quemar tokens con control de autoridad
- **Transferencias**: Sistema de transferencias entre cuentas
- **Pausa de emergencia**: Capacidad de pausar/reanudar el contrato
- **Control de acceso**: Sistema de autoridad transferible
- **Supply tracking**: Seguimiento del suministro total
- **Decimales configurables**: 6 decimales por defecto (como USDC)

## 📋 Prerequisitos

Asegúrate de tener instalado:

- [Rust](https://rustup.rs/) (última versión estable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) v1.17+
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) v0.29.0+
- [Node.js](https://nodejs.org/) v16+
- [Yarn](https://yarnpkg.com/)

## 🚀 Instalación

1. **Clonar o navegar al directorio del proyecto**

```bash
cd solana-hackathon
```

2. **Instalar dependencias**

```bash
yarn install
```

3. **Configurar Solana para Devnet**

```bash
solana config set --url devnet
```

4. **Crear una wallet (si no tienes una)**

```bash
solana-keygen new
```

5. **Obtener SOL de devnet**

```bash
solana airdrop 2
```

## 🔨 Compilación

Compilar el programa:

```bash
anchor build
```

Esto generará el archivo IDL y los binarios en el directorio `target/`.

## 🌐 Despliegue en Devnet

### Opción 1: Despliegue automático con script

```bash
anchor deploy --provider.cluster devnet
```

Luego ejecuta el script de inicialización:

```bash
ts-node scripts/deploy.ts
```

### Opción 2: Despliegue paso a paso

1. **Desplegar el programa**

```bash
anchor deploy --provider.cluster devnet
```

2. **Copiar el Program ID** que aparece en la consola

3. **Actualizar el Program ID** en:
   - [Anchor.toml](Anchor.toml) (línea `solana_stablecoin = "..."`)
   - [lib.rs](programs/solana-stablecoin/src/lib.rs) (línea `declare_id!(...)`)

4. **Recompilar y redesplegar**

```bash
anchor build
anchor deploy --provider.cluster devnet
```

5. **Inicializar la stablecoin**

```bash
ts-node scripts/deploy.ts
```

## 🧪 Pruebas

Ejecutar las pruebas en localnet:

```bash
anchor test
```

Para ejecutar tests en devnet:

```bash
anchor test --skip-local-validator
```

## 📖 Uso

### Mintear tokens

Ejecuta el script para mintear tokens a tu cuenta:

```bash
ts-node scripts/mint-tokens.ts
```

### Interactuar con el programa

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "./target/types/solana_stablecoin";

const provider = anchor.AnchorProvider.env();
const program = anchor.workspace.SolanaStablecoin as Program<SolanaStablecoin>;

// Obtener el estado del contrato
const [stablecoinState] = PublicKey.findProgramAddressSync(
  [Buffer.from("stablecoin")],
  program.programId
);

const state = await program.account.stablecoinState.fetch(stablecoinState);
console.log("Total Supply:", state.totalSupply.toString());
console.log("Paused:", state.paused);
```

## 🔑 Funciones Principales

### `initialize(decimals: u8)`
Inicializa el contrato de la stablecoin.
- **Parámetros**: `decimals` - número de decimales (ej: 6)
- **Permisos**: Solo la autoridad inicial

### `mint_tokens(amount: u64)`
Acuña nuevos tokens.
- **Parámetros**: `amount` - cantidad a mintear
- **Permisos**: Solo la autoridad
- **Requisitos**: Contrato no pausado

### `burn_tokens(amount: u64)`
Quema tokens existentes.
- **Parámetros**: `amount` - cantidad a quemar
- **Permisos**: Dueño de los tokens
- **Requisitos**: Contrato no pausado

### `transfer_tokens(amount: u64)`
Transfiere tokens entre cuentas.
- **Parámetros**: `amount` - cantidad a transferir
- **Requisitos**: Contrato no pausado

### `pause()`
Pausa todas las operaciones del contrato.
- **Permisos**: Solo la autoridad

### `unpause()`
Reanuda las operaciones del contrato.
- **Permisos**: Solo la autoridad

### `transfer_authority(new_authority: Pubkey)`
Transfiere la autoridad del contrato.
- **Parámetros**: `new_authority` - nueva dirección de autoridad
- **Permisos**: Solo la autoridad actual

## 📁 Estructura del Proyecto

```
solana-hackathon/
├── programs/
│   └── solana-stablecoin/
│       ├── src/
│       │   └── lib.rs          # Contrato principal
│       └── Cargo.toml
├── tests/
│   └── solana-stablecoin.ts    # Tests del contrato
├── scripts/
│   ├── deploy.ts               # Script de despliegue
│   └── mint-tokens.ts          # Script para mintear tokens
├── Anchor.toml                 # Configuración de Anchor
├── Cargo.toml                  # Configuración de Rust workspace
└── package.json                # Dependencias de Node.js
```

## 🔐 Seguridad

- ✅ Control de acceso con verificación de autoridad
- ✅ Protección contra overflow/underflow
- ✅ Pausa de emergencia
- ✅ Validación de cantidades
- ✅ Uso de PDAs (Program Derived Addresses) para seguridad

## 🌍 Verificar en Explorer

Después del despliegue, puedes ver tu token en Solana Explorer:

```
https://explorer.solana.com/address/[MINT_ADDRESS]?cluster=devnet
```

## 📝 Notas

- El contrato usa 6 decimales por defecto (igual que USDC)
- El Program ID debe coincidir en `Anchor.toml` y `lib.rs`
- Asegúrate de tener suficiente SOL en devnet para las transacciones
- Guarda el Mint Address después del despliegue para futuras interacciones

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🆘 Solución de Problemas

### Error: "Insufficient funds"
```bash
solana airdrop 2
```

### Error: "Program ID mismatch"
Asegúrate de que el Program ID en `Anchor.toml` y `declare_id!()` en `lib.rs` sean iguales.

### Error al compilar
```bash
cargo clean
anchor build
```

### Tests fallan
```bash
solana-test-validator --reset
anchor test
```

## 📞 Soporte

Si tienes problemas o preguntas, por favor abre un issue en el repositorio.

---

**¡Feliz desarrollo en Solana! 🚀**
