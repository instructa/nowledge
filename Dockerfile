# Use pnpm official image for better caching and consistency
FROM node:22.12-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.14.4

# Install Python and build dependencies for sqlite-vec and llama-cpp
RUN apk add --no-cache python3 py3-pip python3-dev build-base wget bash

WORKDIR /app

# Copy package manifests and install dependencies (including dev for build)
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Setup sqlite-vec and models
COPY scripts/setup-sqlite-vec.sh ./scripts/
RUN chmod +x scripts/setup-sqlite-vec.sh && ./scripts/setup-sqlite-vec.sh

# Copy the rest of the application code
COPY . .

# Build the application (creates the dist folder)
RUN pnpm build

# Remove dev dependencies after build
RUN pnpm prune --prod

# --- Release Stage ---
FROM node:22-alpine AS release

# Install Python runtime
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary artifacts from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/models ./models
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /usr/lib/python3*/site-packages /usr/lib/python3.12/site-packages

# Set LD_LIBRARY_PATH for sqlite-vec
ENV LD_LIBRARY_PATH=/app/lib:$LD_LIBRARY_PATH

# Set the entrypoint to your CLI script
ENTRYPOINT ["node", "bin/cli.mjs"]