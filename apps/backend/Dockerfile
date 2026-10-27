# Multi-stage Dockerfile for Automotors Garage Backend
# Stage 1: Build & Dependencies
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/security-foundation/package.json ./packages/security-foundation/
COPY packages/database/package.json ./packages/database/
COPY apps/backend/package.json ./apps/backend/

# Copy source trees
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

# Install dependencies
RUN npm install

# Stage 2: Production Runner
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Run as non-root unprivileged node user
USER node

# Copy application artifacts from builder
COPY --chown=node:node --from=builder /app /app

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health/live || exit 1

CMD ["node", "--experimental-strip-types", "apps/backend/src/main.ts"]
