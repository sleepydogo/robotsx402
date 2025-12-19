#!/bin/bash

# Script para limpiar y reconstruir el proyecto

echo "🧹 Limpiando contenedores y volúmenes..."

# Detener todos los contenedores
docker compose down

# Eliminar volúmenes (esto borrará la base de datos)
docker compose down -v

# Limpiar imágenes antiguas del proyecto
docker rmi robotsx402-backend robotsx402-frontend 2>/dev/null || true

echo ""
echo "🔨 Reconstruyendo imágenes..."
docker compose build --no-cache

echo ""
echo "🚀 Levantando servicios..."
docker compose up -d

echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

echo ""
echo "📊 Estado de los servicios:"
docker compose ps

echo ""
echo "📝 Ver logs en tiempo real:"
echo "  docker compose logs -f"
echo ""
echo "📝 Ver logs del backend:"
echo "  docker compose logs -f backend"
echo ""
echo "✅ ¡Listo! Verifica los logs arriba."
