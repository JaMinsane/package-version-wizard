ARG BUN_VERSION=1.3.11

FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /app

FROM base AS deps-dev
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS deps-prod
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BODY_SIZE_LIMIT=1M

COPY --chown=node:node package.json ./
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build ./build

USER node

EXPOSE 3000

CMD ["node", "build"]
