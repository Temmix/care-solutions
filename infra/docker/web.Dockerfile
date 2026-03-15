# ── Stage 1: Install dependencies ───────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json turbo.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

# Build shared → web (turbo handles order)
RUN npx turbo run build --filter=@care/web

# ── Stage 3: Runner (nginx) ────────────────────────────
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
