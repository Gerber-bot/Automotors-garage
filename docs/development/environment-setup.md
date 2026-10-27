# Environment Setup & Onboarding Guide

## Prerequisites
- **Node.js**: >= 24.18.0 (LTS recommended)
- **Package Manager**: `pnpm` >= 9.x
  - To enable via Corepack:
    ```bash
    corepack enable
    corepack prepare pnpm@latest --activate
    ```
- **PostgreSQL**: Version 16 or 17 (or Docker Compose)
- **Docker & Docker Compose**: Optional for containerized backing services

## Quick Start (Local Setup)

1. **Clone repository & copy environment configuration**:
   ```bash
   cp .env.example .env
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start local backing services**:
   ```bash
   docker compose up -d postgres
   ```

4. **Run database migrations**:
   ```bash
   pnpm --filter @automotors/database db:migrate
   ```

5. **Start development servers**:
   ```bash
   pnpm dev
   ```
   - Backend API: `http://localhost:4000/api/v1`
   - Swagger / OpenAPI: `http://localhost:4000/api/docs`
   - Frontend Application: `http://localhost:3000`
