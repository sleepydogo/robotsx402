#!/bin/bash

set -e

echo "🚀 ROBOTSx402 Deployment Script"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.production.example to .env and configure it:"
    echo "  cp .env.production.example .env"
    echo "  nano .env"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$DB_PASSWORD" ] || [ -z "$SECRET_KEY" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Error: Missing required environment variables!${NC}"
    echo "Please configure DB_PASSWORD, SECRET_KEY, and ANTHROPIC_API_KEY in .env"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Pull latest changes (if in git repo)
if [ -d .git ]; then
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull
    echo -e "${GREEN}✓ Code updated${NC}"
fi

# Build and start containers
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Check services health
echo -e "${YELLOW}Checking services status...${NC}"
docker-compose ps

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose exec -T backend alembic upgrade head

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Deployment completed successfully! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Services are running:"
echo "  - Frontend: http://localhost (nginx proxy)"
echo "  - Backend API: http://localhost/api"
echo "  - Database: PostgreSQL on port 5432 (internal)"
echo "  - Redis: on port 6379 (internal)"
echo ""
echo "Next steps:"
echo "  1. Configure DNS records:"
echo "     - robotsx402.fun -> Your VPS IP"
echo "     - api.robotsx402.fun -> Your VPS IP"
echo "     - www.robotsx402.fun -> Your VPS IP"
echo ""
echo "  2. Obtain SSL certificates:"
echo "     ./ssl-setup.sh"
echo ""
echo "  3. Monitor logs:"
echo "     docker-compose logs -f"
echo ""
echo "  4. Check service status:"
echo "     docker-compose ps"
echo ""
