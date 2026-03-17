# ── Seed runner: builds on top of API deps + Prisma ──────
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/logger/package.json apps/logger/
COPY packages/shared/package.json packages/shared/

RUN npm ci

# Generate Prisma client for Alpine (prisma/ dir includes seed.ts)
COPY apps/api/prisma/ apps/api/prisma/
RUN cd apps/api && npx prisma generate

# Install tsx for running TypeScript directly
RUN npx tsx --version

# Set env vars (DATABASE_URL and ENCRYPTION_MASTER_KEY come from ECS task)
ENV ENCRYPTION_ENABLED=true

WORKDIR /app/apps/api

CMD ["npx", "tsx", "prisma/seed.ts"]
