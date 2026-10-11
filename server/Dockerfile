FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.js ./

# prisma нужен для migrate; bcrypt / better-sqlite3 собираются из исходников
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/dev.db

RUN npx prisma generate \
  && mkdir -p /app/data

EXPOSE 3000

COPY docker-entrypoint.sh /docker-entrypoint.sh
# На Windows файл может прийти с CRLF — убираем, иначе shebang ломается
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
