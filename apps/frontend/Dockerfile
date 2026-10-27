# Multi-stage Dockerfile for Automotors Garage Frontend (Next.js)
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/frontend/package.json ./apps/frontend/

COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/

RUN npm install

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

USER node

COPY --chown=node:node --from=builder /app /app

EXPOSE 3000

CMD ["npm", "--prefix", "apps/frontend", "run", "dev"]
