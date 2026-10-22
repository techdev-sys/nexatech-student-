# Deploy Nexatech School Operations Platform on Railway

This deployment keeps the React application and Laravel API on one HTTPS origin. That is required by the current secure, HTTP-only authentication cookie design.

## Services

The live Railway project is **Nexatech School Operations Platform**. Its public URL is
<https://nexatech-student-monitor.up.railway.app>. It contains these services:

1. **web** — this repository, serving the built React app and Laravel API.
2. **worker** — the same image, running the Redis queue worker continuously.
3. **scheduler** — the same image, running `schedule:run` on Railway cron every five minutes.
4. **MySQL** — Railway's managed MySQL service.
5. **Redis** — Railway's managed Redis service.

The app service definitions are in `.railway/railway.ts`. Deploy current local
source with `railway up --service web`, `railway up --service worker`, and
`railway up --service scheduler`. The web service runs database migrations
before each release. The worker delivers queued jobs. The scheduler runs
retention pruning and other scheduled application work.

## Shared application variables

Set these on `web`, `worker`, and `scheduler` using Railway shared variables where possible. Never commit their values.

```dotenv
APP_NAME="Nexatech School Operations Platform"
APP_ENV=production
APP_DEBUG=false
APP_KEY=<one generated Laravel application key>
APP_URL=https://<public-domain>
FRONTEND_URL=https://<public-domain>

LOG_CHANNEL=stderr
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

REDIS_URL=${{Redis.REDIS_URL}}
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

AUTH_COOKIE_NAME=nexatech_session
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SESSION_ENCRYPT=true

PUBLIC_REGISTRATION_ENABLED=false
DEMO_CODE_LIFETIME_MINUTES=1440
DEMO_SESSION_LIFETIME_MINUTES=120
DEMO_SCHOOL_EMAIL=demo@<public-domain>
DEMO_REQUEST_NOTIFICATION_EMAIL=<your email address>

BACKUP_PROVIDER=railway
BACKUP_RETENTION_DAYS=30
```

Do not set `AUTH_COOKIE_DOMAIN` for the initial Railway domain. A host-only cookie is safer and works correctly. Add SMTP, Africa's Talking, and payment-provider secrets from `backend/.env.production.example` before enabling those features.

Generate `APP_KEY` locally without saving it to a file:

```bash
php artisan key:generate --show
```

Use the exact same `APP_KEY` in all three application services. Changing it later invalidates encrypted sessions and data.

## First release

1. Generate a public Railway domain for the web service.
2. Set `APP_URL`, `FRONTEND_URL`, `DEMO_SCHOOL_EMAIL`, `DEMO_REQUEST_NOTIFICATION_EMAIL`, and mail sender values to that domain.
3. Deploy the web service and confirm `https://<public-domain>/up` returns HTTP 200.
4. Run the demo seeder once from the web service shell (or set
   `SEED_DEMO_SCHOOL=true` for exactly one web deployment, then remove it):

   ```bash
   php artisan db:seed --class=DemoSchoolSeeder --force
   ```

5. Run the production readiness check:

   ```bash
   php artisan production:check
   ```

6. Create the first platform administrator with `php artisan
   platform:bootstrap-admin` after setting one-time
   `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` and
   `BOOTSTRAP_PLATFORM_ADMIN_PASSWORD_HASH` variables. Alternatively, set
   `BOOTSTRAP_PLATFORM_ADMIN=true` for exactly one web deployment. Remove all
   three variables immediately afterward. The hash must be bcrypt; never put
   the plaintext password in Railway variables or source control.
7. Deploy the worker and scheduler services.
8. Enable Railway database backups and point uptime/error monitoring at the public URL.

Do not run `DatabaseSeeder` in production: it creates development accounts and sample credentials. Only the dedicated `DemoSchoolSeeder` is approved for the public demo tenant.

## Domain and go-live

After the generated Railway domain is healthy, attach the final custom domain to the web service. Railway provisions TLS automatically. Update `APP_URL`, `FRONTEND_URL`, `DEMO_SCHOOL_EMAIL`, and mail sender values to the custom domain, then redeploy all three application services.

Before inviting real schools, complete the verification checklist in `docs/PRODUCTION_RUNBOOK.md`, including tenant-isolation tests, payment webhooks, mail/SMS delivery, backup restore, privacy documents, and monitoring alerts.

## Current launch blockers

The site is hosted, the synthetic read-only demo school exists, and public
registration is disabled. The platform administrator is
`sinclare12@gmail.com`. After the first login, use **Change Password** in the
account menu to replace the temporary bootstrap password; this revokes all
existing sessions. Mail currently uses Laravel's `log` transport, so
demo access codes and password recovery emails are **not delivered**. SMTP,
SMS, payment credentials, automated database backups, restore testing, and
monitoring alerts are not yet verified. Do not onboard real schools or accept
payments until these are configured and the production runbook is completed.
