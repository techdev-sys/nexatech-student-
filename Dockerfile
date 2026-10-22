# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS frontend-build

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM php:8.4-apache-bookworm AS runtime

ENV APP_ENV=production \
    APP_DEBUG=false \
    APACHE_DOCUMENT_ROOT=/var/www/html/public \
    PORT=8080

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" bcmath gd intl pdo_mysql zip \
    && curl --fail --location --retry 5 --retry-all-errors \
        https://github.com/phpredis/phpredis/archive/refs/tags/6.3.0.tar.gz \
        --output /tmp/phpredis.tar.gz \
    && mkdir -p /tmp/phpredis \
    && tar -xzf /tmp/phpredis.tar.gz --strip-components=1 -C /tmp/phpredis \
    && cd /tmp/phpredis \
    && phpize \
    && ./configure --enable-redis \
    && make -j"$(nproc)" \
    && make install \
    && docker-php-ext-enable redis \
    && a2dismod mpm_event mpm_worker \
    && a2enmod mpm_prefork \
    && a2enmod headers rewrite \
    && rm -rf /var/lib/apt/lists/* /tmp/phpredis /tmp/phpredis.tar.gz

WORKDIR /var/www/html

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY backend/ ./
COPY --from=frontend-build /build/frontend/dist/ ./public/
COPY deploy/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/start.sh /usr/local/bin/nexatech-start

RUN chmod +x /usr/local/bin/nexatech-start \
    && mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && composer dump-autoload --no-dev --classmap-authoritative --no-interaction

EXPOSE 8080

CMD ["/usr/local/bin/nexatech-start", "web"]
