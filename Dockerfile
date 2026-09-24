# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Stage 1: Cached Dependency Layer ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/dashboard/package.json ./apps/dashboard/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- Stage 2: Builder ---
FROM deps AS builder
WORKDIR /app
COPY . .
ARG NUXT_API_PROXY_TARGET=http://server:24001
ENV NITRO_PRESET=node-server \
    NUXT_API_PROXY_TARGET=$NUXT_API_PROXY_TARGET \
    NUXT_PUBLIC_API_URL=""
RUN pnpm --filter @trial-booking/dashboard build

# --- Stage 3: Lightweight Server Runner ---
FROM base AS server-runner
WORKDIR /app
RUN addgroup --system --gid 10001 nodejs && adduser --system --uid 10001 hono
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=hono:nodejs /app/packages ./packages
COPY --from=deps --chown=hono:nodejs /app/apps/server/node_modules ./apps/server/node_modules
COPY --chown=hono:nodejs package.json pnpm-workspace.yaml ./
COPY --chown=hono:nodejs packages/shared ./packages/shared
COPY --chown=hono:nodejs apps/server ./apps/server
USER hono
ENV NODE_ENV=production \
    PORT=24001
EXPOSE 24001
CMD ["pnpm", "--filter", "@trial-booking/server", "start"]

# --- Stage 4: Ultra-Compact Dashboard Runner (.output only) ---
FROM node:22-alpine AS dashboard-runner
WORKDIR /app
RUN addgroup --system --gid 10001 nodejs && adduser --system --uid 10001 nuxtjs
COPY --from=builder --chown=nuxtjs:nodejs /app/apps/dashboard/.output ./.output
USER nuxtjs
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=24002 \
    NUXT_API_PROXY_TARGET=http://server:24001
EXPOSE 24002
CMD ["node", ".output/server/index.mjs"]
