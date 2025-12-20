#!/bin/bash

# ==============================================
# Script de instalación y configuración de Nginx
# Para ROBOTSx402 en VPS de producción
# Genera todas las configuraciones automáticamente
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

# 3. Crear directorio para configuraciones
echo ""
echo "📋 Preparando directorios..."
sudo mkdir -p /etc/nginx/conf.d
sudo mkdir -p /var/www/certbot

# 4. Crear configuraciones temporales sin SSL para obtener certificados
echo ""
echo "🔧 Creando configuraciones temporales para validación SSL..."

# Frontend temporal (solo HTTP)
sudo tee /etc/nginx/conf.d/frontend.conf > /dev/null <<'EOF'
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
sudo tee /etc/nginx/conf.d/backend.conf > /dev/null <<'EOF'
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

# 5. Verificar configuración de Nginx
echo ""
echo "🔍 Verificando configuración de Nginx..."
sudo nginx -t

# 6. Iniciar Nginx
echo ""
echo "▶️  Iniciando Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. Obtener certificados SSL
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

# 8. Crear configuraciones finales con SSL
echo ""
echo "🔄 Creando configuraciones finales con SSL..."

# FRONTEND con SSL
sudo tee /etc/nginx/conf.d/frontend.conf > /dev/null <<'EOF'
# Frontend - robotsx402.fun
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

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name robotsx402.fun www.robotsx402.fun;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/robotsx402.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/robotsx402.fun/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Client max body size
    client_max_body_size 10M;

    # Proxy to Next.js (Docker on port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js specific: WebSocket support for hot reload (development)
    location /_next/webpack-hmr {
        proxy_pass http://localhost:3000/_next/webpack-hmr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# BACKEND con SSL
sudo tee /etc/nginx/conf.d/backend.conf > /dev/null <<'EOF'
# Backend API - api.robotsx402.fun
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

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.robotsx402.fun;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/api.robotsx402.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.robotsx402.fun/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;

    # CORS headers (handled by FastAPI, but can add here as backup)
    # add_header Access-Control-Allow-Origin "https://robotsx402.fun" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Client max body size (for file uploads)
    client_max_body_size 50M;

    # Proxy to FastAPI backend (port 8000, NO Docker)
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts (FastAPI puede tardar en algunas operaciones)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # WebSocket support (si usas WebSockets en FastAPI)
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 9. Verificar y recargar Nginx
echo ""
echo "✅ Verificando configuración final..."
sudo nginx -t

echo ""
echo "🔄 Recargando Nginx con configuración SSL..."
sudo systemctl reload nginx

# 10. Configurar renovación automática de certificados
echo ""
echo "⏰ Configurando renovación automática de certificados..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 11. Verificar estado
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
echo "📝 Configuración generada:"
echo "  - Frontend: /etc/nginx/conf.d/frontend.conf"
echo "  - Backend:  /etc/nginx/conf.d/backend.conf"
echo ""
echo "🔧 Servicios esperados:"
echo "  - Frontend (Next.js): localhost:3000 (Docker)"
echo "  - Backend (FastAPI):  localhost:8000 (systemd)"
echo ""
echo "📊 Próximos pasos:"
echo "  1. Verifica que el frontend esté corriendo: curl http://localhost:3000"
echo "  2. Verifica que el backend esté corriendo: curl http://localhost:8000/health"
echo "  3. Verifica los logs de Nginx: sudo tail -f /var/log/nginx/error.log"
echo "  4. Verifica los certificados SSL: sudo certbot certificates"
echo ""
echo "🔧 Comandos útiles:"
echo "  - Verificar config:  sudo nginx -t"
echo "  - Recargar Nginx:    sudo systemctl reload nginx"
echo "  - Reiniciar Nginx:   sudo systemctl restart nginx"
echo "  - Ver logs acceso:   sudo tail -f /var/log/nginx/access.log"
echo "  - Ver logs errores:  sudo tail -f /var/log/nginx/error.log"
echo "  - Renovar SSL:       sudo certbot renew --dry-run"
echo ""
