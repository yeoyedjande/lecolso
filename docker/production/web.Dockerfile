# Image de production du frontend (service Railway : web). Contexte de build : racine du dépôt.
# Sert l'application et relaie /api/* et /sanctum/* vers l'API (même origine, ADR 0005).
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Railway transmet les variables du service déclarées en ARG au moment du build
ARG VITE_API_URL=/api/v1
ARG VITE_APP_ENV=production
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_ENV=$VITE_APP_ENV
RUN npm run build

FROM caddy:2-alpine
COPY docker/production/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# API sur le réseau privé de Railway (surchargée par .railway/railway.ts)
ENV API_UPSTREAM=http://api.railway.internal:8080
