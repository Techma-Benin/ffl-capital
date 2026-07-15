#!/bin/bash
set -e

# Replit has no connection pooler — DIRECT_URL equals DATABASE_URL
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

echo "→ Installing dependencies..."
npm install --legacy-peer-deps

echo "→ Generating Prisma client..."
npx prisma generate

echo "→ Applying database migrations..."
npx prisma migrate deploy

echo "✓ Post-merge setup complete."
