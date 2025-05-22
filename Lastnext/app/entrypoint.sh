#!/bin/sh
set -e

echo "Setting up Next.js application with Prisma and NextAuth..."



# Push auth schema to database
echo "Creating NextAuth tables in database..."
npx prisma db push --schema=./prisma/auth.prisma --accept-data-loss

echo "Setup complete! Starting Next.js application..."

# Start the Next.js application
exec npm start