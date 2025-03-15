# Use a Node.js version compatible with npm@11.2.0
FROM node:20.17.0-alpine AS base
RUN npm install -g npm@11.2.0  # Update npm globally
RUN npm config set legacy-peer-deps true  # Set legacy-peer-deps globally

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# Sync package-lock.json with package.json
RUN npm install
# Perform clean install with updated lockfile
RUN npm ci --omit=dev --legacy-peer-deps

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PRIVATE_API_URL
ARG API_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG JWT_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://pmcs.site} \
    NEXT_PRIVATE_API_URL=${NEXT_PRIVATE_API_URL:-http://django-backend:8000} \
    API_URL=${API_URL:-http://django-backend:8000} \
    NEXTAUTH_URL=${NEXTAUTH_URL:-https://pmcs.site} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    JWT_SECRET=${JWT_SECRET} \
    GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
    GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
COPY prisma ./prisma
RUN npx prisma validate && npx prisma generate
RUN npx prisma validate --schema=./prisma/auth.prisma && npx prisma generate --schema=./prisma/auth.prisma
RUN npm run build

# Runner stage - NO USER SWITCHING
FROM base AS runner
WORKDIR /app

COPY app/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

# Make sure necessary directories exist
RUN mkdir -p /app/.npm
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node

ENV PORT=3000 \
    NODE_ENV=production \
    HOSTNAME="0.0.0.0" \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://pmcs.site} \
    NEXT_PRIVATE_API_URL=${NEXT_PRIVATE_API_URL:-http://django-backend:8000} \
    API_URL=${API_URL:-http://django-backend:8000} \
    NEXTAUTH_URL=${NEXTAUTH_URL:-https://pmcs.site} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    JWT_SECRET=${JWT_SECRET} \
    GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
    GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET} \
    DATABASE_URL="postgresql://postgres:postgres@db:5432/postgres"

# Don't switch users - run as root
EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "start"]