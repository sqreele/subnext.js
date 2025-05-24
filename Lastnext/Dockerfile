# Use a Node.js version compatible with npm@11.2.0
FROM node:20.17.0-alpine AS base
RUN npm install -g npm@11.2.0

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Initialize shadcn
RUN npx shadcn@latest init --yes

# Build arguments
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PRIVATE_API_URL
ARG API_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG JWT_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET

# Set environment variables for build
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

RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

# Create user
RUN addgroup --system --gid 999 nodejs && \
    adduser --system --uid 999 --ingroup nodejs nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/components.json* ./
RUN mkdir -p /app/.npm && chown -R nextjs:nodejs /app

# Runtime environment variables (you'll need to pass these when running the container)
ENV PORT=3000 \
    NODE_ENV=production \
    HOSTNAME="0.0.0.0"

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]