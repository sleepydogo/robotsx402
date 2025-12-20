# Dockerfile for rUSD Airdrop
FROM python:3.11-slim

# Install Node.js 20, npm, and yarn
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g ts-node typescript yarn \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy solana-engine (needed for minting)
COPY ./solana-engine /app/solana-engine
WORKDIR /app/solana-engine
RUN yarn install

# Copy airdrop-web
WORKDIR /app/airdrop-web
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/api/health || exit 1

# Start server
CMD ["python", "server.py"]
