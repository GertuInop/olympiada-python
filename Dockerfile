# ===== фронт =====
FROM node:22-bookworm-slim AS client-build
WORKDIR /client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ===== бэкенд + статика =====
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
COPY server/prisma.config.js ./

RUN npm ci

COPY server/ ./
COPY --from=client-build /client/dist ./public

RUN npx prisma generate \
  && mkdir -p /app/data

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_DIST=/app/public
ENV DATABASE_URL=file:/app/data/dev.db

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
