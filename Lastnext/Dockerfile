# Specify exact node version for better reproducibility
FROM node:20.11.1-alpine AS base

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

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



# Validate Prisma schema and generate client
RUN npx prisma validate

# Validate Prisma schema and generate client
# Create and validate auth.prisma
COPY prisma/auth.prisma ./prisma/auth.prisma
RUN npx prisma validate
RUN npx prisma generate
RUN npx prisma validate --schema=./prisma/auth.prisma
RUN npx prisma generate --schema=./prisma/auth.prisma
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy entrypoint script
COPY app/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

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
    GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
