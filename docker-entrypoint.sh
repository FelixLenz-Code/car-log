#!/bin/sh
set -e

echo "[entrypoint] Waiting for database & applying migrations..."
# Retry migrate deploy until the database is reachable.
ATTEMPTS=0
until npx prisma migrate deploy; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 20 ]; then
    echo "[entrypoint] Database not reachable after 20 attempts — giving up."
    exit 1
  fi
  echo "[entrypoint] Database not ready yet, retrying in 3s ($ATTEMPTS/20)..."
  sleep 3
done

echo "[entrypoint] Seeding initial admin (idempotent)..."
npx prisma db seed || echo "[entrypoint] Seed skipped/failed (non-fatal)."

echo "[entrypoint] Starting app..."
exec "$@"
