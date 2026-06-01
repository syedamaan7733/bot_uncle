#!/usr/bin/env sh
# Build the Vite frontend against the Fly backend URL and publish dist/ to S3.
set -eu

: "${VITE_API_URL:?Set VITE_API_URL to the backend Fly URL, e.g. https://bot-uncle.fly.dev}"
: "${S3_BUCKET:?Set S3_BUCKET to the frontend S3 bucket name}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

cd "$FRONTEND_DIR"

npm ci
VITE_API_URL="$VITE_API_URL" npm run build

aws s3 sync dist/ "s3://$S3_BUCKET" --delete ${AWS_S3_SYNC_ARGS:-}

if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "${CLOUDFRONT_INVALIDATION_PATHS:-/*}"
fi
