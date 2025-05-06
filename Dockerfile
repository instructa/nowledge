# Build stage
FROM node:18-slim AS builder

# Install build dependencies
RUN apt-get update && \
    apt-get install -y build-essential python3 git && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm run build
RUN pnpm run download-model

# Compile sqlite-vec extension if not already in native/
RUN cd /app && \
    if [ ! -f "native/libsqlite_vec.so" ] && [ ! -f "native/libsqlite_vec.dylib" ]; then \
        git clone https://github.com/asg017/sqlite-vec && \
        cd sqlite-vec && \
        make && \
        mkdir -p /app/native && \
        cp build/libsqlite_vec.* /app/native/; \
    fi

# Runtime stage
FROM node:18-slim

# Install runtime dependencies for SQLite
RUN apt-get update && \
    apt-get install -y sqlite3 && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/native ./native
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/models ./models

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Create volumes for data persistence
VOLUME /data
VOLUME /models

# Set environment variables
ENV NODE_ENV=production \
    NOWLEDGE_DB_FILE=/data/.nowledge.db \
    NOWLEDGE_MODEL_PATH=/models

# Default command runs the CLI
ENTRYPOINT ["node", "dist/bin/nowledge.mjs"]
CMD ["--help"]