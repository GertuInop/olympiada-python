#!/bin/sh
set -e

mkdir -p /app/data

echo ">> prisma migrate deploy"
npx prisma migrate deploy

# По умолчанию сидим демо-данные (как на локалке), если БД пустая
SEED_ON_START="${SEED_ON_START:-1}"
if [ "$SEED_ON_START" = "1" ] || [ "$SEED_ON_START" = "true" ]; then
  echo ">> seed demo users + olympiads"
  node prisma/seed.js
fi

echo ">> OLIMP on :${PORT:-3000}"
exec node index.js
