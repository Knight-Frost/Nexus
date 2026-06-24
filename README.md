# Nexus

**Nexus** is a full-stack property rental management platform. It manages the
complete lifecycle of a rental — property and unit catalogues, public listings
with admin moderation, landlord⇄tenant contracts, an immutable financial ledger,
Stripe-backed rent payments, multi-channel notifications, and analytics — for
three audiences: **tenants**, **landlords**, and **administrators**.

| | |
|---|---|
| **Backend** | Laravel 12 · PHP 8.2+ · Sanctum (API tokens) · Stripe · Twilio |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 |
| **Database** | SQLite (default) · MySQL / PostgreSQL supported |
| **Tests** | 287 backend tests (PHPUnit) · strict TS + ESLint on the frontend |

> Architecture, security, RBAC, and contributor guidance live in
> [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/). Start there for the deep dive.

---

## Architecture at a glance

```
React SPA (frontend/)  ──HTTP/JSON (Bearer token)──▶  Laravel API (app/)
   role-aware UI                                         Route → Middleware (role gate)
   typed API client                                        → FormRequest (validation)
   auth context + guards                                     → Controller (thin)
                                                                → Service (business logic)
                                                                  → Model (Eloquent + enums)
                                                              → Policy (ownership)
                                                            → Observer/Event/Listener
                                                              (audit, notifications, cache)
```

- **The API is the source of truth for authorization.** The SPA's role-based
  routing is a UX convenience; every request is enforced server-side.
- **Money is stored in integer cents**; `contracts` and `ledger_entries` use
  UUID primary keys; the ledger and audit log are **immutable**.

---

## Prerequisites

- PHP **8.2+**, Composer 2
- Node **18+** and npm
- SQLite (bundled with PHP) — or MySQL/PostgreSQL if you prefer

---

## Quick start

### 1. Backend (API)

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite          # SQLite is the default connection
php artisan migrate:fresh --seed        # schema + rich demo data (development mode)
php artisan nexus:seed:verify           # optional: verify the demo graph + ledger
php artisan serve                       # http://localhost:8000
```

Seeding is **mode-aware**: `migrate:fresh --seed` builds the full local demo
graph, while `NEXUS_SEED_MODE=production php artisan db:seed` creates only a safe,
idempotent baseline (no demo data). See **[docs/SEEDING.md](docs/SEEDING.md)**.

### 2. Frontend (SPA)

```bash
cd frontend
npm install
npm run dev                             # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so no CORS setup
is needed in development. Open **http://localhost:5173** and sign in.

### Demo accounts (from the seeder)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@wyncrest.test` | `password` |
| Landlord (full access) | `landlord.verified@wyncrest.test` | `password` |
| Landlord (limited) | `landlord.limited@wyncrest.test` | `password` |
| Tenant (active lease) | `tenant.active@wyncrest.test` | `password` |
| Tenant (overdue + late fee) | `tenant.showcase@wyncrest.test` | `password` |

> Demo credentials are for local development only and use the reserved
> `@wyncrest.test` domain — they are never created in production mode. The full
> account list lives in [docs/SEEDING.md](docs/SEEDING.md).

---

## Testing

```bash
# Backend — 287 tests (auth, RBAC/IDOR, contracts, ledger, payments,
# notifications, analytics, caching, security hardening)
php artisan test            # or: composer test

# Code style (PHP)
./vendor/bin/pint           # format    ·    ./vendor/bin/pint --test  (check only)

# Frontend
cd frontend
npm run lint                # ESLint
npm run build               # tsc typecheck + production build
```

---

## Build & deploy

```bash
# Frontend production bundle → frontend/dist
cd frontend && npm run build

# Backend production caches
php artisan config:cache && php artisan route:cache
```

Before deploying, work through the production checklist at the bottom of
[`.env.example`](.env.example) and see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
At minimum: `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, real Stripe/Twilio
credentials, a real DB (MySQL/Postgres) + Redis, a queue worker, the scheduler
(`php artisan schedule:run` via cron), and `CORS_ALLOWED_ORIGINS` /
`SANCTUM_STATEFUL_DOMAINS` pointed at the deployed SPA origin.

---

## Documentation

| Doc | Contents |
|-----|----------|
| [`CLAUDE.md`](CLAUDE.md) | Project memory: architecture, RBAC, security, standards, what not to change |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Every endpoint: auth, request fields, response shapes, enums |
| [`docs/SECURITY.md`](docs/SECURITY.md) | OWASP-aligned controls, audit findings, operational hardening |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Backend architecture notes |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guidance |
| [`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md) | Phased completion plan and validation matrix |

---

## Project layout

```
app/                 Laravel application (models, controllers, services, policies, …)
routes/              API + console route definitions
database/            migrations, factories, seeders
tests/               PHPUnit Feature/Unit tests + k6 load scripts
config/              framework + service configuration
frontend/            React + TypeScript SPA (the user-facing app)
docs/                architecture, API, security, deployment, plan
CLAUDE.md            permanent project memory
```

---

## Security

Authorization is enforced server-side at three layers (route middleware →
policy → service). Financial records use UUID keys and an immutable ledger;
privileged actions are written to an append-only audit log; Stripe webhooks are
signature-verified and payments are idempotent. See [`docs/SECURITY.md`](docs/SECURITY.md).

Found a vulnerability? Do not open a public issue — contact the maintainers
privately.

---

## Branding

The product name and all user-facing strings are controlled from two central files:

| Layer | Config file | How to read it |
|-------|-------------|----------------|
| Backend (PHP) | `config/brand.php` | `config('brand.display_name')`, `config('brand.short_name')`, etc. |
| Frontend (TS) | `frontend/src/config/brand.ts` | `import { brand, pageTitle } from '@/config/brand'` |
| HTML shell | `frontend/index.html` | Vite plugin in `frontend/vite.config.js` replaces `%BRAND_NAME%` etc. |

### Env vars that drive the brand

Backend (in `.env`):
- `BRAND_DISPLAY_NAME` — full product name (default: `Wyncrest`)
- `BRAND_SHORT_NAME` — compact name used in SMS (default: `Wyncrest`)
- `BRAND_LEGAL_NAME` — legal entity name (default: `Wyncrest`)
- `BRAND_SUPPORT_NAME` — support team name (default: `Wyncrest Support`)
- `BRAND_DESCRIPTOR` — product descriptor (default: `Property Platform`)
- `BRAND_TAGLINE` / `BRAND_SECONDARY_TAGLINE`
- `MAIL_ADMIN_ADDRESS` — platform admin email (default: `admin@wyncrest.app`)

Frontend (must be prefixed `VITE_` for Vite):
- `VITE_APP_NAME`, `VITE_BRAND_SHORT_NAME`, `VITE_BRAND_INITIAL`
- `VITE_BRAND_DESCRIPTOR`, `VITE_BRAND_TAGLINE`, `VITE_BRAND_SECONDARY_TAGLINE`
- `VITE_BRAND_AUTH_HEADLINE`, `VITE_BRAND_AUTH_SUBHEADLINE`, `VITE_SUPPORT_NAME`

All values default to `Wyncrest` strings — the app works with zero configuration.

### Files you must NOT hand-edit for a rename

Change env vars only. The following files are the source of truth:
- `config/brand.php` (backend defaults)
- `frontend/src/config/brand.ts` (frontend defaults)
- `frontend/index.html` (uses `%BRAND_NAME%` / `%BRAND_DESCRIPTOR%` / `%BRAND_TAGLINE%`)
- `frontend/public/site.webmanifest` (static asset — update manually when renaming)

### Verifying no user-facing hardcoded names remain

```bash
grep -rn "Homecrest\|HOMECREST\|Nexus\|NEXUS" frontend/src app resources/views config \
  | grep -v "NexusCard\|nexus_\|nvx-\|--nexus\|nexus:\|// \|#\|* "
```

Any remaining hits are either CSS/internal identifiers (intentional) or user-facing bugs.

---

## License

MIT.
