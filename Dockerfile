# ---------- Build stage ----------
FROM node:18-slim AS builder

RUN apt-get update \
    && apt-get install -y build-essential python3 git \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
RUN pnpm run download-model
# ▽▽▽  deleted sqlite-vec compile block ▽▽▽

# ---------- Runtime stage ----------
FROM node:18-slim

RUN apt-get update \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/models ./models
COPY --from=builder /app/package.json ./package.json
RUN pnpm install --prod --no-frozen-lockfile

VOLUME /data
VOLUME /models

# RQLITE_URL can be overridden by docker-compose.yml
ENV NODE_ENV=production \
    NOWLEDGE_DB_FILE=/data/.nowledge.db \
    NOWLEDGE_MODEL_PATH=/models \
    RQLITE_URL=http://localhost:4001

ENTRYPOINT ["node", "dist/bin/nowledge.mjs"]
CMD ["--help"]
