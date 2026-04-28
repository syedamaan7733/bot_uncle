# Legacy Product Import Instructions

This guide explains how to import legacy Mongo-style products into your backend using:

- `backend/scripts/import_legacy_products.py`

The script calls your existing `POST /products` API, so normal product creation logic (including indexing/embedding flow) is reused.

---

## 1) Prerequisites

- Backend API is running at `http://localhost:3000`
- Valid JWT token for the target business
- Input file exists at `backend/data/products.json` (or any `.json` / `.jsonl`)
- Python 3 is installed

Quick checks:

```bash
curl -i http://localhost:3000/health
ls backend/data/products.json
python3 --version
```

---

## 2) Database Cleanup (if needed)

If you need to wipe import data for this business:

- Business ID: `f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb`

Run this in Supabase SQL editor:

```sql
BEGIN;

DELETE FROM usage_logs
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

DELETE FROM payments
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

DELETE FROM pricing_configs
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

DELETE FROM user_balances
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

DELETE FROM smart_import_jobs
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

DELETE FROM products
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

DELETE FROM categories
WHERE business_id = 'f0ffb9a5-9801-4db3-8d3d-8d6bf753e7bb';

COMMIT;
```

---

## 3) Current Import Behavior

The script currently does this by default:

- One product per color variant
- If color has many images, it keeps only the **first image**
- Category lookup by name:
  - use existing category if found
  - otherwise create category automatically
- 2-second per-item delay (`--sleep-ms 2000`)
- After every **15 successful uploads**, rest **30 seconds**

---

## 4) Run Import

Export token:

```bash
export API_TOKEN='YOUR_JWT_TOKEN'
```

Run:

```bash
python3 backend/scripts/import_legacy_products.py \
  --input "backend/data/products.json" \
  --api-base "http://localhost:3000" \
  --token "$API_TOKEN"
```

---

## 5) Optional Flags

- `--dry-run`  
  Preview payloads without creating products.

- `--batch-size N`  
  Rest interval trigger (default: `15`).

- `--batch-rest-ms M`  
  Rest duration in milliseconds (default: `30000`).

- `--sleep-ms X`  
  Per-product delay in milliseconds (default: `2000`).

- `--no-create-missing-categories`  
  Fail when category name is missing in DB instead of auto-creating.

Example:

```bash
python3 backend/scripts/import_legacy_products.py \
  --input "backend/data/products.json" \
  --api-base "http://localhost:3000" \
  --token "$API_TOKEN" \
  --batch-size 20 \
  --batch-rest-ms 45000
```

---

## 6) Logs and Output

The script prints:

- source progress: `[current/total]`
- generated variants count per source product
- per product status:
  - `[UPLOAD X] OK created`
  - `SKIP duplicate`
  - `FAIL create`
- pause/resume messages after each batch
- final import summary

If failures occur, a file is written near input file:

- `backend/data/products.json.failed.json`

---

## 7) Troubleshooting

- **401 Unauthorized**  
  Token expired/invalid. Re-login and export a fresh token.

- **429 OpenAI rate limit logs**  
  Expected occasionally. Script already throttles in batches.  
  Increase rest:
  - `--batch-size 10 --batch-rest-ms 60000`

- **Connection refused / API down**  
  Ensure backend server is running before import.

- **Category conflicts**  
  Normalize category names in source data (trim spaces/case consistency).

