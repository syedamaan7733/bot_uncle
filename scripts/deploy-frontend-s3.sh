#!/usr/bin/env sh
# Build the Vite frontend against the Fly backend URL and deploy it to Fly.
set -eu

VITE_API_URL="${VITE_API_URL:-https://botuncle-backend.fly.dev}"

FLYCTL="${FLYCTL:-flyctl}"
if ! command -v "$FLYCTL" >/dev/null 2>&1; then
  if command -v fly >/dev/null 2>&1; then
    FLYCTL=fly
  else
    echo "flyctl or fly CLI is required" >&2
    exit 127
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

cd "$FRONTEND_DIR"

npm ci
VITE_API_URL="$VITE_API_URL" npm run build

exec "$FLYCTL" deploy --remote-only --config fly.toml "$@"
