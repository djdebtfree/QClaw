FROM node:22-slim

LABEL maintainer="QuantumClaw <hello@allin1.app>"
LABEL description="QuantumClaw — AI agent runtime with knowledge graph memory"

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy source and install dependencies
COPY . .
RUN npm ci --omit=dev

# Create workspace directories and default config for production
RUN mkdir -p workspace/memory workspace/logs workspace/delivery-queue workspace/media /root/.quantumclaw \
    && echo '{"dashboard":{"host":"0.0.0.0","port":3000},"models":{"primary":{"provider":"anthropic","model":"claude-sonnet-4-5-20250929"}}}' > /root/.quantumclaw/config.json

# Dashboard port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/ping').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start
CMD ["node", "src/index.js"]
