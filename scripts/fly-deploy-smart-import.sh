#!/usr/bin/env sh
# Deploy the private smart-import Fly app with the committed smart-import-service/fly.toml.
set -eu

FLYCTL="${FLYCTL:-flyctl}"
if ! command -v "$FLYCTL" >/dev/null 2>&1; then
  if command -v fly >/dev/null 2>&1; then
    FLYCTL=fly
  else
    echo "flyctl or fly CLI is required" >&2
    exit 127
  fi
fi

cd "$(dirname "$0")/../smart-import-service"
exec "$FLYCTL" deploy --remote-only --config fly.toml "$@"
