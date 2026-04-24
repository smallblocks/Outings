FROM node:20-slim AS base

# better-sqlite3 needs build tools for its native binding
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY app/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

FROM base AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY app/package.json ./package.json
COPY app/src ./src
COPY app/public ./public

ENV NODE_ENV=production
ENV PORT=8787
ENV CONFIG_PATH=/data/config.json
ENV DB_PATH=/data/outings.db

# /data is mounted as a StartOS volume
VOLUME ["/data"]
EXPOSE 8787

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/server.js"]
