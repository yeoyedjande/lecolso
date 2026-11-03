# Image de production du frontend (service Railway : web). Contexte de build : racine du dépôt.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Railway transmet les variables du service déclarées en ARG au moment du build
ARG VITE_API_URL
ARG VITE_APP_ENV=production
ARG VITE_DEMO_MODULES=false
ARG VITE_TENANT_DOMAIN=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_ENV=$VITE_APP_ENV \
    VITE_DEMO_MODULES=$VITE_DEMO_MODULES \
    VITE_TENANT_DOMAIN=$VITE_TENANT_DOMAIN
RUN npm run build

FROM caddy:2-alpine
COPY docker/production/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
