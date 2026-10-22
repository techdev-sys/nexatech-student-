#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FRONTEND_NPM_DIR="$FRONTEND_DIR"

# Prefer the project-local runtimes when they are available.
if [[ -f "$PROJECT_DIR/.tools/php/php.exe" ]]; then
  export PATH="$PROJECT_DIR/.tools/php:$PATH"
fi

if [[ -f "$PROJECT_DIR/.tools/node/node.exe" ]]; then
  export PATH="$PROJECT_DIR/.tools/node:$PATH"
fi

# Native Windows npm cannot resolve Git Bash paths such as /c/Users/...
if command -v cygpath >/dev/null 2>&1; then
  FRONTEND_NPM_DIR="$(cygpath -w "$FRONTEND_DIR")"
fi

if [[ ! -f "$BACKEND_DIR/artisan" ]]; then
  echo "Laravel artisan file not found at: $BACKEND_DIR/artisan" >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Frontend package.json not found at: $FRONTEND_DIR/package.json" >&2
  exit 1
fi

cd "$BACKEND_DIR"

COLORS="#93c5fd,#c4b5fd,#fdba74"
NAMES="server,queue,frontend"
COMMANDS=(
  "php artisan serve --port=8888"
  "php artisan queue:listen --tries=1 --timeout=0"
  "npm --prefix \"$FRONTEND_NPM_DIR\" run dev"
)

if php -r 'exit(function_exists("pcntl_fork") ? 0 : 1);'; then
  COLORS="#93c5fd,#c4b5fd,#fb7185,#fdba74"
  NAMES="server,queue,logs,frontend"
  COMMANDS=(
    "php artisan serve --port=8888"
    "php artisan queue:listen --tries=1 --timeout=0"
    "php artisan pail --timeout=0"
    "npm --prefix \"$FRONTEND_NPM_DIR\" run dev"
  )
fi

echo "Starting StudentMonitor system..."
echo "  - Laravel server    -> http://localhost:8888"
echo "  - Queue worker      -> background jobs"
if [[ "$NAMES" == *logs* ]]; then
  echo "  - Log viewer        -> live logs"
else
  echo "  - Log viewer        -> skipped (pcntl is unavailable)"
fi
echo "  - Frontend (React)  -> http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

npx concurrently \
  -c "$COLORS" \
  --names "$NAMES" \
  --kill-others \
  "${COMMANDS[@]}"
