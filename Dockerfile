FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

EXPOSE 5174

# Run as dev server (vite serve:lan) — the API routes live in vite.config.ts
CMD ["npm", "run", "serve:lan"]
