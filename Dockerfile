# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
  && corepack prepare pnpm@10.27.0 --activate \
  && pnpm config set store-dir /pnpm/store

RUN --mount=type=cache,id=payload-ai-tester-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN mkdir -p public \
  && pnpm build

FROM node:24-bookworm-slim AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PAYLOAD_UPLOAD_DIR=/app/media

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates poppler-utils \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/media \
  && chown -R nextjs:nodejs /app/media

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/docs ./docs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
