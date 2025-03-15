#!/bin/sh
set -e

echo "Setting up Next.js application with Prisma and NextAuth..."

# Install required dependencies
echo "Installing dependencies..."
npm install @prisma/client @next-auth/prisma-adapter
npm install prisma --save-dev

# Generate Prisma client for main schema
echo "Generating Prisma client for main schema..."
npx prisma generate

# Generate Prisma client for auth schema
echo "Generating Prisma client for auth schema..."
npx prisma generate --schema=./prisma/auth.prisma

# Push auth schema to database
echo "Creating NextAuth tables in database..."
npx prisma db push --schema=./prisma/auth.prisma --accept-data-loss

echo "Setup complete! Starting Next.js application..."

# Start the Next.js application
exec npm start