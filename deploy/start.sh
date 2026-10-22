#!/bin/sh
set -eu

cd /var/www/html

# Render assigns the public hostname at deploy time. Keep the SPA and API on
# that single HTTPS origin unless an explicit custom-domain URL is configured.
if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_HOSTNAME:-}" ]; then
    export APP_URL="https://${RENDER_EXTERNAL_HOSTNAME}"
fi

if [ -z "${FRONTEND_URL:-}" ] && [ -n "${APP_URL:-}" ]; then
    export FRONTEND_URL="$APP_URL"
fi

mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache

php artisan config:cache
php artisan view:cache

mode="${1:-${SERVICE_MODE:-web}}"

case "$mode" in
    web)
        php artisan migrate --force
        if [ -n "${DEMO_ADMIN_PASSWORD_HASH:-}" ]; then
            php artisan demo:provision-admin
        fi
        if [ -n "${DEMO_VISITOR_PASSWORD_HASH:-}" ]; then
            php artisan demo:provision-visitor
        fi
        if [ "${SEED_DEMO_SCHOOL:-false}" = "true" ]; then
            php artisan db:seed --class=DemoSchoolSeeder --force
        fi
        if [ "${BOOTSTRAP_PLATFORM_ADMIN:-false}" = "true" ]; then
            php artisan platform:bootstrap-admin
        fi
        a2dismod mpm_event mpm_worker
        a2enmod mpm_prefork
        sed -ri 's/^[[:space:]]*Listen[[:space:]]+80$/Listen 8080/' /etc/apache2/ports.conf
        apache2ctl -t
        exec apache2-foreground
        ;;
    worker)
        exec php artisan queue:work --sleep=3 --tries=3 --timeout=120
        ;;
    scheduler)
        exec php artisan schedule:run --verbose --no-interaction
        ;;
    *)
        echo "Unknown service mode: $mode" >&2
        exit 64
        ;;
esac
