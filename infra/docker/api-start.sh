#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/apps/api && npx prisma migrate deploy
echo "Migrations complete."

if [ "$RUN_SEED" = "true" ]; then
  echo "Running database seed..."
  cd /app/apps/api && npx prisma db seed
  echo "Seed complete."
fi

echo "Starting API server..."
exec node /app/apps/api/dist/main.js
