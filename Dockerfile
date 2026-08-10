# Один образ для web (Next.js) и bot (tsx). Debian-slim — дружелюбен к Prisma.
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# --- зависимости (кэшируемый слой) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- сборка ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* инлайнятся во время сборки — прокидываем домен
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npx prisma generate && npm run build

# --- рантайм ---
FROM base AS runtime
ENV NODE_ENV=production
# Копируем всё, включая node_modules (в т.ч. tsx для бота) и .next
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
