# --------------------------------------------------
# Build stage
# --------------------------------------------------
FROM node:20-slim AS builder
ARG DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1

RUN apt-get update -qq \
    && apt-get install --no-install-recommends -y \
        build-essential python3 python3-pip git git-lfs curl unzip gettext-base rustc cargo \
    && python3 -m pip install --no-cache-dir -U pip \
    && python3 -m pip install --no-cache-dir huggingface_hub[cli] \
    && corepack enable \
    && corepack prepare pnpm@9.14.4 --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# download model early so it is cached in its own layer
RUN python3 scripts/download-model.py

# build native sqlite extension only if missing
RUN test -f native/libsqlite_vec.so || \
    (git clone --depth 1 https://github.com/asg017/sqlite-vec \
        && cd sqlite-vec \
        && ./scripts/vendor.sh \
        && make loadable \
        && mkdir -p /app/native \
        && cp dist/vec*.so /app/native/libsqlite_vec.so)

# Compile TypeScript sources into the dist directory
RUN pnpm run build \
    && pnpm prune --prod

# --------------------------------------------------
# Runtime stage
# --------------------------------------------------
FROM node:20-slim
ARG DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1 \
    NODE_ENV=production \
    KNOWLEDGE_DB_FILE=/data/.nowledge.db \
    KNOWLEDGE_MODEL_PATH=/models

RUN apt-get update -qq \
    && apt-get install --no-install-recommends -y sqlite3 \
    && corepack enable \
    && corepack prepare pnpm@9.14.4 --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/native ./native
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/models ./models
COPY --from=builder /app/node_modules ./node_modules

VOLUME /data
VOLUME /models
ENTRYPOINT ["node", "./bin/cli.mjs"]
CMD ["--help"]