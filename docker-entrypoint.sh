#!/bin/sh
set -e

mkdir -p /app/data

echo ">> prisma migrate deploy"
npx prisma migrate deploy

if [ "$SEED_ON_START" = "1" ] || [ "$SEED_ON_START" = "true" ]; then
  echo ">> seed"
  node prisma/seed.js || true
fi

echo ">> OLIMP on :${PORT:-3000}"
exec node index.js
