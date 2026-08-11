#!/bin/bash
set -e

echo "=== Running Luxe System Verification ==="

echo "1. Checking Next.js Frontend Build..."
npm run build
echo "✅ Frontend Build Successful"

echo "2. Checking Firebase Functions Build..."
cd functions
npm run build
cd ..
echo "✅ Functions Build Successful"

echo "3. Typechecking remaining scripts..."
npx tsc --noEmit scripts/seed-pricing.ts
npx tsc --noEmit scripts/seed-users.ts
echo "✅ Typechecking passed"

echo "=== Verification Complete! System is healthy. ==="
