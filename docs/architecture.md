# System architecture & data flows

This document describes how the main applications connect and how data moves through **Smart Import**, **dashboard products**, and **store AI search**. Diagrams use [Mermaid](https://mermaid.js.org/) (render in GitHub, VS Code, or [mermaid.live](https://mermaid.live)).

---

## 1. Containers (who talks to whom)

```mermaid
flowchart LR
  subgraph client [Browser]
    FE[React frontend]
  end

  subgraph api [NestJS backend]
    Nest[HTTP API]
  end

  subgraph py [Python service]
    SIP[smart-import-service FastAPI]
  end

  subgraph data [Data and external APIs]
    PG[(PostgreSQL + pgvector)]
    CL[Cloudinary]
    OAI[OpenAI APIs]
  end

  FE -->|JWT / REST| Nest
  Nest -->|Prisma| PG
  Nest -->|upload assets| CL
  Nest -->|embeddings / vision| OAI
  Nest -->|POST /process-image| SIP
  SIP -->|OCR / vision / parse| OAI
  SIP -->|download catalog URL| CL
```

| Component | Role |
|-----------|------|
| **Frontend** | Dashboard (products, smart import) and public store; calls only the Nest API base URL. |
| **NestJS** | Auth, products/categories/store routes, billing, smart-import jobs, image upload, **`SearchService`** (index + query). |
| **smart-import-service** | Stateless catalog pipeline: preprocess → OCR → layout → GPT vision → GPT extract → category embedding match → returns JSON products. |
| **PostgreSQL** | Products, categories, businesses, `smart_import_jobs`, **`product_embeddings`** (vectors). |
| **Cloudinary** | Catalog uploads (`catalog-imports`), product images (`product-images`), cropped regions from import. |
| **OpenAI** | Chat/vision (descriptions, catalog parsing), **`text-embedding-3-large`** (Nest search index + queries), **`text-embedding-3-small`** (Python category matcher). |

Nest is configured with **`PYTHON_SERVICE_URL`** (default `http://localhost:8000`) for Smart Import.

---

## 2. Smart Import (end-to-end)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant Nest as NestJS
  participant CL as Cloudinary
  participant PG as PostgreSQL
  participant Py as Python /process-image
  participant OAI as OpenAI

  U->>FE: Upload catalog (image/PDF)
  FE->>Nest: POST /smart-import/upload
  Nest->>CL: Upload catalog → secure_url
  Nest->>PG: Create SmartImportJob (PROCESSING)
  Nest-->>FE: jobId

  Note over Nest,Py: Background: processCatalogAsync
  Nest->>PG: Load categories for business
  Nest->>Py: POST /process-image imageUrl, categories
  Py->>CL: GET catalog image
  Py->>Py: Preprocess, OCR, layout, crop URLs
  Py->>OAI: Vision + product JSON + embeddings (category match)
  Py-->>Nest: products array
  Nest->>PG: Job READY_FOR_REVIEW + resultJson

  loop Poll until ready
    FE->>Nest: GET /smart-import/:jobId
    Nest->>PG: Read job
    Nest-->>FE: status + products
  end

  U->>FE: Review / edit / confirm
  FE->>Nest: POST /smart-import/:jobId/confirm
  Nest->>PG: Create categories (if new) + products + imageUrls
  Nest->>Nest: SearchService.indexProduct each product async
  Nest->>PG: Job COMPLETED
  Nest-->>FE: import summary
```

**Python pipeline (logical order):** download raster → OCR (e.g. Tesseract) → layout hints (LayoutLM / OpenCV fallback) → GPT-4o-mini vision summary → GPT extract structured products → optional Cloudinary crops → **`category_matcher`**: embed product labels vs category names, apply similarity threshold + exact name match → response.

---

## 3. Dashboard: add product and search index

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant Nest as NestJS
  participant OAI as OpenAI
  participant CL as Cloudinary
  participant PG as PostgreSQL

  opt Optional: image preview before save
    FE->>Nest: POST /products/image-description/preview
    Nest->>OAI: Vision on file (data URL)
    Nest-->>FE: description
    Note over FE: Append to line 3; skipImageVision on upload if preview succeeded
  end

  U->>FE: Submit form
  FE->>Nest: POST /products
  Nest->>PG: INSERT product (often imageUrls empty)
  Nest->>Nest: indexProduct(id) async
  Nest->>PG: Load product; build docText from name/category/price/lines
  Nest->>OAI: text-embedding-3-large(docText)
  Nest->>PG: UPSERT product_embeddings

  opt If new image file
    FE->>Nest: POST /products/:id/images optional skipImageVision
    Nest->>CL: Upload images
    Nest->>PG: UPDATE imageUrls
    Nest->>Nest: indexProduct with optional skip vision
    Note over Nest: If skip: no second vision call; docText uses lines including line 3
    Nest->>OAI: embedding only
    Nest->>PG: UPSERT product_embeddings
  end
```

---

## 4. Public store: list vs AI search

```mermaid
sequenceDiagram
  participant U as Shopper
  participant FE as Store UI
  participant Nest as NestJS
  participant PG as PostgreSQL
  participant OAI as OpenAI

  alt No search query
    U->>FE: Open store / pick category
    FE->>Nest: GET /store/:slug/products
    Nest->>PG: Prisma findMany active products
    Nest-->>FE: Products JSON
  else Text search (semantic)
    U->>FE: Enter search text
    FE->>Nest: GET /store/:slug/products?search=
    Nest->>OAI: embed query text-embedding-3-large
    Nest->>PG: Vector similarity JOIN product_embeddings
    Nest->>Nest: Billing AI_SEARCH
    Nest-->>FE: Ranked products
  else Image search
    U->>FE: Upload query image
    FE->>Nest: POST /store/:slug/image-search
    Nest->>OAI: describe image then embed + vector search
    Nest-->>FE: searchText + ranked products
  end
```

---

## 5. Where state lives (quick reference)

| Concern | Storage / service |
|--------|-------------------|
| Product rows | `products` (Prisma) |
| Semantic retrieval | `product_embeddings` (`embedding`, `source_text`) |
| Import jobs | `smart_import_jobs` + `resultJson` |
| Category matcher tuning | Python env `SMART_IMPORT_CATEGORY_MATCH_THRESHOLD` |
| Python service URL | Nest `PYTHON_SERVICE_URL` |

---

## 6. How to view these diagrams

- **GitHub**: Mermaid renders in `.md` files automatically.
- **VS Code**: “Markdown Preview Mermaid Support” or similar extension.
- **Export PNG/SVG**: Paste into [mermaid.live](https://mermaid.live) and export.

For a single **poster** diagram (all boxes on one canvas), copy the container diagram into [draw.io](https://app.diagrams.net/) and expand manually.
