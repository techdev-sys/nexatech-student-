#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

if [[ ! -f "$BACKEND_DIR/artisan" ]]; then
  echo "Laravel artisan file not found at: $BACKEND_DIR/artisan" >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Frontend package.json not found at: $FRONTEND_DIR/package.json" >&2
  exit 1
fi

cd "$BACKEND_DIR"

echo "Starting StudentMonitor system..."
echo "  - Laravel server    -> http://localhost:8888"
echo "  - Queue worker      -> background jobs"
echo "  - Log viewer        -> live logs"
echo "  - Frontend (React)  -> http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

npx concurrently \
  -c "#93c5fd,#c4b5fd,#fb7185,#fdba74" \
  --names "server,queue,logs,frontend" \
  --kill-others \
  "php artisan serve --port=8888" \
  "php artisan queue:listen --tries=1 --timeout=0" \
  "php artisan pail --timeout=0" \
  "npm --prefix \"$FRONTEND_DIR\" run dev"
