# Production Deployment: Fly.io Backend + S3 Frontend

The old EC2, Docker Compose, and Caddy deployment path is preserved on the `archive/deploy-v0.1` branch and the `v0.1-aws-docker-deploy` tag. The active deployment is:

- Nest backend on Fly.io, managed by PM2.
- `smart-import-service` on a separate Fly.io app, reachable from the backend through Fly private networking.
- React frontend on AWS S3 + CloudFront.

## Architecture

```mermaid
flowchart LR
  browser["Browser"] --> frontend["S3 and CloudFront"]
  frontend --> backendPublic["Backend Fly HTTPS app"]
  subgraph backendApp [Fly App: bot-uncle]
    pm2["PM2 runtime"]
    nest["Nest API :3000"]
    pm2 --> nest
  end
  subgraph smartImportApp [Fly App: bot-uncle-smart-import]
    fastapi["FastAPI :8000"]
  end
  backendPublic --> nest
  nest -->|"PYTHON_SERVICE_URL=http://bot-uncle-smart-import.internal:8000"| fastapi
  nest --> postgres["Postgres"]
  nest --> cloudinary["Cloudinary"]
```

## Prerequisites

- Fly CLI authenticated with `fly auth login`.
- AWS CLI authenticated with permission to sync the frontend S3 bucket and invalidate CloudFront.
- Existing Postgres database URL, Cloudinary credentials, OpenAI key, and WhatsApp webhook token.
- Frontend S3 bucket and CloudFront distribution already configured for SPA hosting.

## 1. Preserve the Old Deployment Reference

This has already been prepared in this migration:

```bash
git branch archive/deploy-v0.1
git tag v0.1-aws-docker-deploy
```

Do not continue using the archived EC2/Docker docs for new deploys.

## 2. Create Fly Apps

Run once per environment:

```bash
cd smart-import-service
fly apps create bot-uncle-smart-import

cd ../backend
fly apps create bot-uncle
```

If the backend app already exists, keep using it.

## 3. Scale Fly Machines

Backend:

```bash
cd backend
fly scale vm shared-cpu-1x --memory 1024
```

Smart import with LayoutLM/Torch enabled:

```bash
cd smart-import-service
fly scale vm shared-cpu-2x --memory 4096
```

If `LAYOUT_ENABLED=false`, smart import can start smaller:

```bash
fly scale vm shared-cpu-1x --memory 2048
```

Upgrade smart import to `performance-2x --memory 8192` if model warmup is slow, imports time out, or logs show OOM kills.

## 4. Set Fly Secrets

Smart import:

```bash
cd smart-import-service
fly secrets set \
  OPENAI_API_KEY="..." \
  CLOUDINARY_CLOUD_NAME="..." \
  CLOUDINARY_API_KEY="..." \
  CLOUDINARY_API_SECRET="..."
```

Backend:

```bash
cd ../backend
fly secrets set \
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public" \
  JWT_SECRET="change-me-long-random-string" \
  JWT_EXPIRES_IN="7d" \
  WHATSAPP_WEBHOOK_VERIFY_TOKEN="..." \
  ALLOWED_ORIGINS="https://YOUR_FRONTEND_CLOUDFRONT_URL" \
  PYTHON_SERVICE_URL="http://bot-uncle-smart-import.internal:8000" \
  OPENAI_API_KEY="..." \
  CLOUDINARY_CLOUD_NAME="..." \
  CLOUDINARY_API_KEY="..." \
  CLOUDINARY_API_SECRET="..."
```

## 5. Deploy Fly Apps

Deploy smart import first so the backend dependency is ready:

```bash
./scripts/deploy-production.sh smart-import
./scripts/deploy-production.sh backend
```

Or deploy both Fly apps:

```bash
./scripts/fly-deploy-smart-import.sh
./scripts/fly-deploy.sh
```

The backend deploy runs `prisma migrate deploy` as the Fly release command before starting the PM2-managed API process.

## 6. Verify Backend and Smart Import

Backend public health:

```bash
curl -f https://bot-uncle.fly.dev/health/live
curl -f https://bot-uncle.fly.dev/health
```

Backend logs:

```bash
fly logs -a bot-uncle
```

Smart import logs:

```bash
fly logs -a bot-uncle-smart-import
```

Private service check from the backend app:

```bash
fly ssh console -a bot-uncle --command "node -e \"fetch('http://bot-uncle-smart-import.internal:8000/health').then(r=>r.text()).then(console.log)\""
```

## 7. Deploy Frontend to S3 + CloudFront

Build the frontend with the backend Fly URL baked into Vite:

```bash
VITE_API_URL="https://bot-uncle.fly.dev" \
S3_BUCKET="YOUR_FRONTEND_BUCKET" \
CLOUDFRONT_DISTRIBUTION_ID="YOUR_CLOUDFRONT_DISTRIBUTION_ID" \
./scripts/deploy-frontend-s3.sh
```

If you do not want to invalidate CloudFront, omit `CLOUDFRONT_DISTRIBUTION_ID`.

## 8. Final Smoke Test

Open the frontend CloudFront URL and test:

- Login/register.
- Dashboard/product API requests.
- Product image upload.
- Smart import upload and review flow.
- WhatsApp webhook callback against `https://bot-uncle.fly.dev`.
