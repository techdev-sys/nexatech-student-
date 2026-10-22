# Nexatech School Operations Platform production runbook

## Launch gate

Do not launch until every item below is evidenced in the deployment record.

1. Copy `backend/.env.production.example` into the secret manager and replace every placeholder. Never commit the resulting environment file.
2. Generate `APP_KEY` with `php artisan key:generate --show`; store it in the secret manager and back it up separately.
3. Deploy the frontend and API on the same HTTPS site, or explicitly configure a trusted same-site subdomain. Redirect HTTP to HTTPS at the load balancer.
4. Use a managed MySQL/PostgreSQL database with encryption, point-in-time recovery, daily snapshots, and at least 30 days retention. Perform and document a restore drill before launch and quarterly thereafter.
5. Use Redis for queues/cache and run a supervised queue worker plus `php artisan schedule:work` (or a one-minute scheduler cron).
6. Run `php artisan migrate --force`, then `php artisan db:seed --class=DemoSchoolSeeder --force`. Never run `DatabaseSeeder` in production.
7. Configure SMTP and run a real demo-code and password-recovery delivery test. Configure Africa's Talking and send a test SMS to an approved internal number.
8. Configure only the payment gateways being launched. Verify webhook secrets, successful settlement, invalid-signature rejection, duplicate delivery, failure, and reconciliation in each gateway sandbox before switching to live credentials.
9. Send application errors to centralized logs and an alert destination. Monitor `/up`, queue depth/failures, scheduler execution, 5xx rate, mail/SMS failures, webhook failures, disk, database connections, and backup success.
10. Run `php artisan data:prune-retention --dry-run`, review `docs/DATA_RETENTION_POLICY.md`, and obtain legal review of the privacy and terms pages.
11. Run `php artisan production:check`; deployment must stop if any check fails. Configure equivalent frontend security headers at the CDN or reverse proxy if the host does not support the included `_headers` file.

## Deployment commands

```text
composer install --no-dev --classmap-authoritative
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan production:check
npm ci
npm run build
php artisan test
```

## Backup acceptance test

- Confirm the latest encrypted snapshot exists and is not stored with the application host.
- Restore it into an isolated environment.
- Run migrations only if the restored version requires them.
- Confirm tenant counts, a sample report card, a sample invoice, and audit records.
- Delete the restore environment and record date, operator, snapshot identifier, and outcome.

## Rollback

Keep the prior application image and release manifest. For schema changes, take a pre-deployment snapshot and prefer forward fixes; only run destructive migration rollback after reviewing its data impact.
