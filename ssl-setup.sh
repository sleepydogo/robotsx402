#!/bin/bash

set -e

echo "🔒 SSL Certificate Setup for ROBOTSx402"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Domains
DOMAINS=(
    "robotsx402.fun"
    "www.robotsx402.fun"
    "api.robotsx402.fun"
)

# Email for Let's Encrypt notifications
read -p "Enter your email for SSL certificate notifications: " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: Email is required!${NC}"
    exit 1
fi

# Create directories
mkdir -p certbot/conf
mkdir -p certbot/www

echo -e "${YELLOW}Obtaining SSL certificates...${NC}"

# Stop nginx if running
docker-compose stop nginx 2>/dev/null || true

# Get certificates for each domain
for DOMAIN in "${DOMAINS[@]}"; do
    echo -e "${YELLOW}Requesting certificate for ${DOMAIN}...${NC}"

    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN"

    echo -e "${GREEN}✓ Certificate obtained for ${DOMAIN}${NC}"
done

# Restart nginx with SSL
echo -e "${YELLOW}Restarting nginx with SSL...${NC}"
docker-compose up -d nginx

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   SSL certificates installed successfully! 🔒${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Your sites are now accessible via HTTPS:"
for DOMAIN in "${DOMAINS[@]}"; do
    echo "  - https://${DOMAIN}"
done
echo ""
echo "Certificates will auto-renew via the certbot container."
echo ""
