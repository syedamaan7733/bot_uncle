#!/usr/bin/env sh
# Deploy with committed fly.toml. Do not run `flyctl config save` when the app has zero Machines.
set -e
cd "$(dirname "$0")/.."
exec flyctl deploy --remote-only "$@"
