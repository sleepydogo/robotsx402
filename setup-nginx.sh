#!/bin/bash

# ==============================================
# Script de instalación y configuración de Nginx
# Para ROBOTSx402 en VPS de producción
# ==============================================

set -e  # Exit on error

echo "🚀 Instalando y configurando Nginx para ROBOTSx402..."

# 1. Instalar Nginx y Certbot
echo ""
echo "📦 Instalando Nginx y Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Detener Nginx temporalmente
echo ""
echo "⏸️  Deteniendo Nginx..."
sudo systemctl stop nginx

# 3. Copiar configuraciones de Nginx
echo ""
echo "📋 Copiando configuraciones de Nginx..."
sudo mkdir -p /etc/nginx/conf.d

# Copiar nginx.conf si existe
if [ -f "nginx/nginx.conf" ]; then
    sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
    echo "✅ nginx.conf copiado"
fi

# Copiar configuraciones de sitios
sudo cp nginx/conf.d/frontend.conf /etc/nginx/conf.d/
sudo cp nginx/conf.d/backend.conf /etc/nginx/conf.d/
echo "✅ Configuraciones de sitios copiadas"

# 4. Crear configuraciones temporales sin SSL para obtener certificados
echo ""
echo "🔧 Creando configuraciones temporales para validación SSL..."

# Frontend temporal (solo HTTP)
sudo tee /etc/nginx/conf.d/frontend-temp.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name robotsx402.fun www.robotsx402.fun;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

# Backend temporal (solo HTTP)
sudo tee /etc/nginx/conf.d/backend-temp.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.robotsx402.fun;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

# Deshabilitar las configuraciones con SSL temporalmente
sudo mv /etc/nginx/conf.d/frontend.conf /etc/nginx/conf.d/frontend.conf.disabled || true
sudo mv /etc/nginx/conf.d/backend.conf /etc/nginx/conf.d/backend.conf.disabled || true

# 5. Crear directorio para validación
sudo mkdir -p /var/www/certbot

# 6. Verificar configuración de Nginx
echo ""
echo "🔍 Verificando configuración de Nginx..."
sudo nginx -t

# 7. Iniciar Nginx
echo ""
echo "▶️  Iniciando Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 8. Obtener certificados SSL
echo ""
echo "🔐 Obteniendo certificados SSL..."
echo ""
read -p "📧 Ingresa tu email para Let's Encrypt: " EMAIL

# Certificado para el frontend
echo ""
echo "🌐 Obteniendo certificado para robotsx402.fun..."
sudo certbot certonly --nginx \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d robotsx402.fun \
    -d www.robotsx402.fun || {
        echo "⚠️  Error obteniendo certificado para frontend. Verifica que el dominio apunte a este servidor."
    }

# Certificado para el backend
echo ""
echo "🔌 Obteniendo certificado para api.robotsx402.fun..."
sudo certbot certonly --nginx \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d api.robotsx402.fun || {
        echo "⚠️  Error obteniendo certificado para backend. Verifica que el dominio apunte a este servidor."
    }

# 9. Restaurar configuraciones con SSL
echo ""
echo "🔄 Activando configuraciones con SSL..."
sudo rm -f /etc/nginx/conf.d/frontend-temp.conf
sudo rm -f /etc/nginx/conf.d/backend-temp.conf
sudo mv /etc/nginx/conf.d/frontend.conf.disabled /etc/nginx/conf.d/frontend.conf || true
sudo mv /etc/nginx/conf.d/backend.conf.disabled /etc/nginx/conf.d/backend.conf || true

# 10. Verificar y recargar Nginx
echo ""
echo "✅ Verificando configuración final..."
sudo nginx -t

echo ""
echo "🔄 Recargando Nginx con configuración SSL..."
sudo systemctl reload nginx

# 11. Configurar renovación automática de certificados
echo ""
echo "⏰ Configurando renovación automática de certificados..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 12. Verificar estado
echo ""
echo "📊 Estado de Nginx:"
sudo systemctl status nginx --no-pager

echo ""
echo "======================================"
echo "✅ ¡Nginx configurado exitosamente!"
echo "======================================"
echo ""
echo "🌐 URLs disponibles:"
echo "  - Frontend: https://robotsx402.fun"
echo "  - Backend:  https://api.robotsx402.fun"
echo ""
echo "📝 Próximos pasos:"
echo "  1. Asegúrate de que Docker esté corriendo: docker-compose ps"
echo "  2. Verifica los logs de Nginx: sudo tail -f /var/log/nginx/error.log"
echo "  3. Verifica los certificados SSL: sudo certbot certificates"
echo ""
echo "🔧 Comandos útiles:"
echo "  - Verificar config:  sudo nginx -t"
echo "  - Recargar Nginx:    sudo systemctl reload nginx"
echo "  - Reiniciar Nginx:   sudo systemctl restart nginx"
echo "  - Ver logs:          sudo tail -f /var/log/nginx/access.log"
echo "  - Ver errores:       sudo tail -f /var/log/nginx/error.log"
echo ""
