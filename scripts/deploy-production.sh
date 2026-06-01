#!/usr/bin/env sh
# Deploy one or all production targets.
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"

case "$TARGET" in
  backend)
    "$SCRIPT_DIR/fly-deploy.sh"
    ;;
  smart-import)
    "$SCRIPT_DIR/fly-deploy-smart-import.sh"
    ;;
  frontend)
    "$SCRIPT_DIR/deploy-frontend-s3.sh"
    ;;
  all)
    "$SCRIPT_DIR/fly-deploy-smart-import.sh"
    "$SCRIPT_DIR/fly-deploy.sh"
    "$SCRIPT_DIR/deploy-frontend-s3.sh"
    ;;
  *)
    echo "Usage: $0 [backend|smart-import|frontend|all]" >&2
    exit 2
    ;;
esac
