# Image de production du backend (services Railway : api, worker, scheduler).
# Contexte de build : racine du dépôt. Seule la commande de démarrage change d'un service à l'autre.
FROM dunglas/frankenphp:1-php8.4-alpine

RUN install-php-extensions pdo_pgsql pgsql redis intl zip bcmath pcntl opcache gd exif \
    && apk add --no-cache postgresql-client

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY docker/production/php.ini /usr/local/etc/php/conf.d/zz-production.ini
COPY docker/production/api.Caddyfile /etc/caddy/Caddyfile

WORKDIR /app

# Dépendances d'abord, pour profiter du cache Docker
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY backend/ ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && php artisan package:discover --ansi \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

# Démarrage par défaut = service api. worker et scheduler surchargent la commande (voir .railway/railway.ts).
CMD ["sh", "-c", "php artisan optimize && frankenphp run --config /etc/caddy/Caddyfile"]
