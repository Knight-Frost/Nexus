# Deployment

This document covers two things: the general checklist for deploying Wyncrest
anywhere, and the specifics of the live demo box, which is a real but
intentionally minimal deployment, not a hardened production reference.

## Environment configuration

Copy `.env.example` to `.env` and set at minimum:

| Variable | Purpose |
|---|---|
| `APP_ENV` | `production` for any real deployment |
| `APP_DEBUG` | Must be `false` in production (prevents stack traces in API responses) |
| `APP_KEY` | Generate with `php artisan key:generate` |
| `APP_URL` | The backend's real origin; used to build absolute storage/mail URLs |
| `FRONTEND_URL` / `APP_FRONTEND_URL` | The SPA's real origin, for CORS and deep-links |
| `SANCTUM_STATEFUL_DOMAINS` | Must include the SPA's production domain |
| `CORS_ALLOWED_ORIGINS` | Must include the SPA's production domain |
| `DB_CONNECTION` | `sqlite` by default; `mysql`/`pgsql` supported for production scale |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Required for real payment capture; webhook signature is verified, never optional |
| `TWILIO_SID` / `TWILIO_TOKEN` / `TWILIO_FROM` | Required for SMS notifications |

Brand strings (`BRAND_*` / `VITE_BRAND_*`) are documented separately in
`.env.example` under `BRANDING`, and let you rename the product without
touching source files (see `CLAUDE.md` section 0 for the config-driven brand
layer).

## Production checklist

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, a real `APP_KEY`
- [ ] HTTPS enforced at the web server, secure session cookies
- [ ] Real Stripe and Twilio credentials (features stay gated off without them)
- [ ] `php artisan config:cache route:cache` after any config or route change
- [ ] A real queue worker running (`php artisan queue:work`) and the scheduler
      cron (`php artisan schedule:run`) if you need rent generation, overdue
      marking, and digest emails to actually fire
- [ ] `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS` point at the
      deployed SPA origin
- [ ] Database credentials are least-privilege and not exposed publicly
- [ ] Composer installed with `--no-dev --optimize-autoloader` (seeding a
      genuine production environment uses `WYNCREST_SEED_MODE=production`,
      which needs no `faker` and works fine under `--no-dev`; see
      `docs/SEEDING.md`)
- [ ] Backups configured for the database
- [ ] Rate limiting confirmed active (`RateLimitByRole` middleware, already
      wired; verify it is not bypassed by a proxy/CDN config)

None of this is enforced by the framework. It is a checklist, not a gate.

## The live demo deployment (EC2)

A demo/staging instance is live at `http://18.216.245.190`. It is a
showcase box, not a hardened production reference: HTTP only, no domain or
TLS, so Stripe webhooks and secure cookies do not work (auth is Bearer-token
based, so login works fine regardless).

| Fact | Value |
|---|---|
| Host | `ec2-user@18.216.245.190`, us-east-2, `i-0f4e0733ca1f463bc`, t3.micro (912 MB RAM), Amazon Linux 2023 |
| App directory | `/var/www/wyncrest` (owner `ec2-user:apache`; `storage/`, `bootstrap/cache/`, `database/` are group-writable so php-fpm can write) |
| Stack | PHP 8.3 + php-fpm (socket `/run/php-fpm/www.sock`), nginx, composer, a 2 GB swapfile so `composer install` does not OOM on 912 MB RAM |
| Services | php-fpm and nginx run under systemd (`enable --now`), so they survive reboots independent of any SSH session |
| Serving model | Single origin: nginx serves the built SPA (`frontend/dist`) at `/` with an `index.html` fallback, and proxies `/api`, `/sanctum`, `/storage`, `/up` to Laravel's `public/index.php`. Same-origin means no CORS and no API-URL env needed on the frontend. |
| Data layer | SQLite at `/var/www/wyncrest/database/database.sqlite`; `QUEUE_CONNECTION=sync` (no worker needed); `CACHE`/`SESSION=database` |
| Demo data | Seeded with `WYNCREST_SEED_MODE=development` plus `WYNCREST_ALLOW_DEV_SEED_IN_PROD=true`, which requires the full (non `--no-dev`) composer install because the demo seeders use `faker`. A genuine production deploy would instead keep `--no-dev` and use `WYNCREST_SEED_MODE=production`, which needs no faker. |

### Redeploying after code changes

```bash
# 1. Build the frontend locally
cd frontend && npm run build

# 2. Sync the tree (excluding local-only paths)
rsync -az --delete \
  --exclude .git --exclude node_modules --exclude vendor \
  --exclude .env --exclude '*.sqlite' \
  --exclude Claude_Study_Guide --exclude .internal \
  ./ ec2-user@18.216.245.190:/var/www/wyncrest

# 3. On the server
ssh -i ~/Downloads/Wyncrest.pem ec2-user@18.216.245.190
cd /var/www/wyncrest
composer install                 # only if dependencies changed
php artisan migrate              # or migrate:fresh --seed --force to reset demo data
php artisan config:cache route:cache
sudo systemctl reload php-fpm nginx
```

### Known limitations of this box

No TLS or domain, no real Stripe/Twilio/Google credentials (those features
stay gated off), no queue worker or scheduler cron, dev dependencies present,
SQLite rather than MySQL/Postgres. It exists to demo the product, not to model
a production deployment.

## Security hardening (applies to any deployment)

- Rate limiting configured and role-aware (already implemented via
  `RateLimitByRole`)
- CORS restricted to known origins, never `*`
- SQL injection: Eloquent/query bindings only, no raw interpolation, already
  enforced by convention across the codebase
- XSS: the API returns JSON only; the SPA escapes output by default (React)
- Firewall and SSH key-only authentication at the host level
- Regular, tested database backups
- Errors never leak stack traces: confirm `APP_DEBUG=false` before going live

See `docs/SECURITY.md` for the full security model, including the audit log
and RBAC design.
