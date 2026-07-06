# ── Build stage: compiles the client bundle, needs full devDependencies ────────
FROM node:22-slim AS build
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ── Runtime stage: standalone Node server (server/index.ts), no Vite dev server ─
FROM node:22-slim AS runtime
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
COPY server ./server
COPY src ./src
COPY public ./public
COPY data ./data

EXPOSE 5174

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
