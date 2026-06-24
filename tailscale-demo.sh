#!/usr/bin/env bash
#
# tailscale-demo.sh — Run the Nexus dev stack on your private Tailscale network.
#
# Only devices invited to your tailnet can access the app.
# No ports are opened to the public internet.
#
# Usage:
#   ./tailscale-demo.sh           Start API + frontend on your Tailscale IP
#   API_PORT=9000 ./tailscale-demo.sh   Override the backend port
#
# Prerequisites:
#   1. Install Tailscale: https://tailscale.com/download/mac  (or: brew install tailscale)
#   2. Connect:           tailscale up
#   3. Invite friends at: https://login.tailscale.com/admin/users
#
# How it works:
#   - Laravel (API) runs on localhost:<API_PORT>   — only reachable by local processes
#   - Vite (frontend) binds to <tailscale-ip>:<WEB_PORT> — only reachable from your tailnet
#   - Vite proxies /api/* → localhost:<API_PORT> server-side, so the backend is never
#     directly exposed to remote devices
#   - CORS_ALLOWED_ORIGINS is patched in .env for this session and restored on exit

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

c_reset=$'\033[0m'; c_green=$'\033[32m'; c_blue=$'\033[34m'; c_yellow=$'\033[33m'; c_red=$'\033[31m'
say()  { printf '%s▸ %s%s\n' "$c_blue" "$1" "$c_reset"; }
ok()   { printf '%s✓ %s%s\n' "$c_green" "$1" "$c_reset"; }
warn() { printf '%s! %s%s\n' "$c_yellow" "$1" "$c_reset"; }
die()  { printf '%s✗ %s%s\n' "$c_red" "$1" "$c_reset" >&2; exit 1; }

# ---- Prerequisites -----------------------------------------------------------
command -v php       >/dev/null || die "PHP not found. Install PHP 8.2+."
command -v composer  >/dev/null || die "Composer not found."
command -v npm       >/dev/null || die "npm not found. Install Node 18+."

# ---- Find Tailscale CLI ------------------------------------------------------
TAILSCALE=""
for candidate in \
    /usr/local/bin/tailscale \
    /opt/homebrew/bin/tailscale \
    "${HOME}/Applications/Tailscale.app/Contents/MacOS/Tailscale" \
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale"; do
  if [ -x "$candidate" ]; then
    TAILSCALE="$candidate"
    break
  fi
done

if [ -z "$TAILSCALE" ]; then
  die "Tailscale CLI not found.

Install Tailscale first — choose one:
  • brew install tailscale        (Homebrew — adds the CLI automatically)
  • https://tailscale.com/download/mac  (App Store version)

After installing, connect to your tailnet:
  sudo tailscale up

Then re-run this script."
fi

# ---- Get Tailscale IP --------------------------------------------------------
TS_IP=$("$TAILSCALE" ip -4 2>/dev/null | head -1 || true)
if [ -z "$TS_IP" ]; then
  die "Could not get your Tailscale IP. Two likely causes:

  1. The tailscaled daemon is not running (Homebrew install requires this):
       brew services start tailscale
     Then authenticate:
       tailscale up
     Then re-run this script.

  2. Tailscale is installed but not logged in:
       tailscale up
     (opens a browser to sign in / create an account)
     Then re-run this script."
fi

ok "Tailscale IP: $TS_IP"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"
TS_FRONTEND_ORIGIN="http://${TS_IP}:${WEB_PORT}"

# ---- Backend bootstrap (same as dev.sh) ---------------------------------------
if [ ! -d vendor ]; then
  say "Installing PHP dependencies…"
  composer install --no-interaction
fi

if [ ! -f .env ]; then
  say "Creating .env from .env.example…"
  cp .env.example .env
fi

if ! grep -qE '^APP_KEY=base64:' .env; then
  say "Generating application key…"
  php artisan key:generate --ansi >/dev/null
fi

if grep -qE '^DB_CONNECTION=sqlite' .env && [ ! -f database/database.sqlite ]; then
  say "Creating SQLite database and seeding demo data…"
  touch database/database.sqlite
  php artisan migrate --force
  php artisan db:seed --force
else
  say "Running migrations…"
  php artisan migrate --force >/dev/null
fi

# ---- Frontend bootstrap ------------------------------------------------------
if [ ! -d frontend/node_modules ]; then
  say "Installing frontend dependencies…"
  (cd frontend && npm install)
fi

# ---- Patch .env CORS (for this session only) ---------------------------------
ENV_FILE="$ROOT/.env"

ORIGINAL_CORS_LINE=$(grep "^CORS_ALLOWED_ORIGINS=" "$ENV_FILE" 2>/dev/null || echo "")
CURRENT_CORS_VALUE="${ORIGINAL_CORS_LINE#CORS_ALLOWED_ORIGINS=}"

CORS_PATCHED=0
if [ -n "$ORIGINAL_CORS_LINE" ] && [[ "$CURRENT_CORS_VALUE" != *"$TS_IP"* ]]; then
  sed -i '' "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${CURRENT_CORS_VALUE},${TS_FRONTEND_ORIGIN}|" "$ENV_FILE"
  CORS_PATCHED=1
  say "Temporarily added ${TS_FRONTEND_ORIGIN} to CORS_ALLOWED_ORIGINS"
elif [ -z "$ORIGINAL_CORS_LINE" ]; then
  echo "CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,${TS_FRONTEND_ORIGIN}" >> "$ENV_FILE"
  CORS_PATCHED=2
  say "Added CORS_ALLOWED_ORIGINS with Tailscale origin"
else
  ok "CORS already includes Tailscale origin — no change needed"
fi

# Clear any cached config so Laravel picks up the patched .env
php artisan config:clear --quiet 2>/dev/null || true

# ---- Cleanup: restore .env on exit -------------------------------------------
PIDS=()
cleanup() {
  printf '\n'
  warn "Shutting down…"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true

  if [ "$CORS_PATCHED" -eq 1 ]; then
    sed -i '' "s|^CORS_ALLOWED_ORIGINS=.*|${ORIGINAL_CORS_LINE}|" "$ENV_FILE"
    php artisan config:clear --quiet 2>/dev/null || true
    ok ".env CORS restored to original."
  elif [ "$CORS_PATCHED" -eq 2 ]; then
    sed -i '' '/^CORS_ALLOWED_ORIGINS=/d' "$ENV_FILE"
    php artisan config:clear --quiet 2>/dev/null || true
    ok ".env CORS line removed (was not present originally)."
  fi

  ok "Stopped."
}
trap cleanup INT TERM EXIT

# ---- Start services ----------------------------------------------------------
say "Starting Laravel API on localhost:${API_PORT}  (private — only the Vite proxy touches this)"
php artisan serve --port="$API_PORT" &
PIDS+=($!)

say "Starting queue worker"
php artisan queue:work --tries=1 --quiet &
PIDS+=($!)

# --host <TS_IP> binds Vite to the Tailscale interface only.
# Requests from friends go: browser → Tailscale → Vite:5173 → (proxy) → localhost:8000
say "Starting frontend SPA bound to Tailscale interface only"
( cd frontend && VITE_API_PROXY="http://localhost:${API_PORT}" npm run dev -- --host "${TS_IP}" ) &
PIDS+=($!)

printf '\n'
ok "Nexus Tailscale demo is running"
printf '\n'
printf '  %s→%s  Share this URL with friends:  %s%s%s\n' "$c_green" "$c_reset" "$c_blue" "$TS_FRONTEND_ORIGIN" "$c_reset"
printf '  %s→%s  Laravel API:                  localhost:%s  (not exposed to tailnet)\n' "$c_green" "$c_reset" "$API_PORT"
printf '\n'
printf '  %sDemo login credentials (password: "password")%s\n' "$c_yellow" "$c_reset"
printf '    admin@nexus.com\n'
printf '    landlord1@example.com\n'
printf '    tenant1@example.com\n'
printf '    tenant2@example.com\n'
printf '\n'
printf '  Friends must be invited to your tailnet at:\n'
printf '  https://login.tailscale.com/admin/users\n'
printf '\n'
printf '  Press Ctrl+C to stop (restores .env automatically).\n\n'

wait
