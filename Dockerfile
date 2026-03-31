ARG BUN_VERSION=1.3.11

FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /app

FROM base AS deps-dev
COPY package.json bun.lock .npmrc ./
RUN bun install --frozen-lockfile

FROM base AS deps-prod
COPY package.json bun.lock .npmrc ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BODY_SIZE_LIMIT=1M

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=bun:bun package.json ./
COPY --from=deps-prod --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/build ./build
COPY --from=builder --chown=bun:bun /app/scripts ./scripts
COPY --from=builder --chown=bun:bun /app/src/lib/server/db ./src/lib/server/db
COPY --chown=bun:bun docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x /app/docker/entrypoint.sh

USER bun

EXPOSE 3000

CMD ["/app/docker/entrypoint.sh"]
