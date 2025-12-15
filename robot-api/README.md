# Chess Robotic Arm API

API sencilla en Python para control de brazo robótico de ajedrez con streaming de video.

## Características

- ✅ Control de brazo robótico mediante coordenadas X,Y (0-7)
- ✅ Streaming de video MJPEG desde webcam
- ✅ Autenticación mediante API Key (header X-API-Key)
- ✅ Documentación automática con Swagger UI

## Tecnologías

- **FastAPI**: Framework web asíncrono
- **OpenCV**: Captura y streaming de video
- **PySerial**: Comunicación serial con Arduino

## Instalación

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env y cambiar API_KEYS por tu clave secreta

# 3. Ejecutar el servidor
python main.py
```

El servidor se ejecutará en `http://localhost:8001`

## Endpoints

### 1. POST `/api/robot/move`

Ejecuta un movimiento del brazo robótico.

**Headers:**
```
X-API-Key: as129skaSF1
```

**Request Body:**
```json
{
  "from": {"x": 6, "y": 4},
  "to": {"x": 4, "y": 4},
  "action": "move"
}
```

- `from`: Posición inicial (x, y entre 0-7)
- `to`: Posición final (x, y entre 0-7)
- `action`: Tipo de movimiento
  - `"move"`: Mover pieza de from → to
  - `"capture"`: Sacar pieza en "to" antes de mover

**Response:**
```json
{
  "status": "success",
  "move": {
    "from": [6, 4],
    "to": [4, 4],
    "action": "move"
  },
  "timestamp": "2025-12-14T10:30:00Z"
}
```

**Ejemplo con curl:**
```bash
curl -X POST "http://localhost:8001/api/robot/move" \
  -H "X-API-Key: as129skaSF1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"x": 6, "y": 4},
    "to": {"x": 4, "y": 4},
    "action": "move"
  }'
```

### 2. GET `/api/robot/stream`

Stream de video MJPEG desde la webcam.

**Headers:**
```
X-API-Key: as129skaSF1
```

**Response:**
- Content-Type: `multipart/x-mixed-replace; boundary=frame`
- Stream continuo de imágenes JPEG

**Uso en HTML:**
```html
<img src="http://localhost:8001/api/robot/stream"
     alt="Robot Camera"
     style="width: 640px; height: 480px;" />
```

**Nota:** Incluir API Key en URL (solo para testing):
```html
<!-- NO RECOMENDADO PARA PRODUCCIÓN -->
<img src="http://localhost:8001/api/robot/stream?x_api_key=as129skaSF1" />
```

**Ejemplo con curl:**
```bash
curl -H "X-API-Key: as129skaSF1" \
  http://localhost:8001/api/robot/stream > stream.mjpeg
```

### 3. GET `/`

Health check endpoint (sin autenticación).

**Response:**
```json
{
  "service": "Chess Robotic Arm API",
  "status": "running",
  "robot_connected": true,
  "camera_connected": true
}
```

## Documentación Interactiva

FastAPI genera automáticamente documentación interactiva:

- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

Desde Swagger UI puedes probar los endpoints directamente:
1. Click en "Authorize"
2. Ingresa tu API Key
3. Prueba los endpoints

## Configuración

Edita el archivo `.env` para personalizar:

```env
# Puerto del servidor
PORT=8001

# API Keys (formato JSON array)
API_KEYS=["as129skaSF1"]

# Índice de la cámara (0 = cámara principal)
CAMERA_INDEX=0

# Resolución del stream
CAMERA_WIDTH=640
CAMERA_HEIGHT=480
CAMERA_FPS=30

# Ruta al archivo CSV con posiciones del tablero
CSV_MATRIX_PATH=/Users/tom/solana-quantum/robot-api/rutinas-movimiento.csv
```

## Seguridad

⚠️ **IMPORTANTE:**

1. **Cambia la API Key por defecto** en `.env`
2. **No compartas tu .env** en git (ya está en .gitignore)
3. **Usa HTTPS en producción** (el stream y API key van sin encriptar con HTTP)
4. Para producción, considera usar tokens JWT en lugar de API Keys simples

## Troubleshooting

### Error: "Robotic arm not available"
- Verifica que el Arduino esté conectado
- Revisa que el puerto serial sea correcto
- Chequea los logs al iniciar el servidor

### Error: "Camera not available"
- Verifica que la webcam esté conectada
- Prueba con otro `CAMERA_INDEX` (1, 2, etc.)
- Revisa permisos de cámara en tu sistema

### Error: "Invalid API Key"
- Verifica que el header sea exactamente `X-API-Key`
- Confirma que la clave esté en el array `API_KEYS` del .env
- Revisa que el formato en .env sea JSON válido: `["clave1","clave2"]`

## Desarrollo

```bash
# Modo desarrollo con auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Ver logs en tiempo real
tail -f logs/robot-api.log
```

## Arquitectura del Sistema

```
┌─────────────┐      HTTP/API Key      ┌──────────────┐
│   Cliente   │ ──────────────────────> │  FastAPI     │
│  (Frontend) │                         │  Server      │
└─────────────┘                         └──────┬───────┘
                                              │
                               ┌──────────────┼──────────────┐
                               │              │              │
                         ┌─────▼──────┐ ┌────▼─────┐ ┌─────▼─────┐
                         │  Camera    │ │  Robot   │ │   Auth    │
                         │  (OpenCV)  │ │  Handler │ │  (API Key)│
                         └────────────┘ └────┬─────┘ └───────────┘
                                             │
                                        ┌────▼─────┐
                                        │ Arduino  │
                                        │ (Serial) │
                                        └──────────┘
```

## Licencia

MIT
