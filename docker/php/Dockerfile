FROM php:8.4-fpm-alpine

COPY --from=mlocati/php-extension-installer:latest /usr/bin/install-php-extensions /usr/local/bin/
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN install-php-extensions pdo_pgsql pgsql redis intl zip bcmath pcntl opcache gd exif \
    && apk add --no-cache postgresql-client git unzip

COPY php.ini /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /var/www/html
