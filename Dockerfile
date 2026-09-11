FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# This image always runs the custom Node server, so compile the browser bundle
# for the native WebSocket transport as well. Public env vars are inlined into
# the Next.js bundle at build time; changing this only at container runtime is
# too late.
ENV NEXT_PUBLIC_REALTIME_TRANSPORT=websocket
RUN npx prisma generate
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_PUBLIC_REALTIME_TRANSPORT=websocket

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy runtime files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/auth.ts ./auth.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create upload directories with write permissions
RUN mkdir -p /app/public/uploads /app/storage/uploads && chown -R nextjs:nodejs /app/public/uploads /app/storage/uploads

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then((response) => process.exit(response.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

# Docker owns the native WebSocket process. Apply migrations at container start,
# then serve Next.js and /ws from one listener.
CMD ["sh", "-c", "npm run db:migrate && npm run start:node"]
