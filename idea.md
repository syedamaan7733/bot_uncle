# WhatsApp SaaS Product - Phase 1 MVP Implementation Plan

## Project Vision

A lean, production-ready SaaS platform enabling small businesses to sell products via WhatsApp with a web-based catalog. The system bridges WhatsApp conversations with a beautiful web storefront, allowing customers to browse products, make selections, and seamlessly transition to WhatsApp for order completion.

### Core Value Proposition

1. **Zero-friction selling**: Businesses can start selling on WhatsApp in minutes
2. **Customer convenience**: Browse products on web, complete purchase on WhatsApp
3. **AI-powered discovery**: Smart product search using embeddings (text + image)
4. **Simple setup**: No complex integrations, just add products and share your link

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Frontend - Vite + React + TS"
        Dashboard[Business Dashboard]
        Store[Public Store Page]
        Router[TanStack Router]
    end
    
    subgraph "Backend - NestJS"
        API[REST API]
        Auth[Auth Module]
        Business[Business Module]
        Product[Product Module]
        Category[Category Module]
        WhatsApp[WhatsApp Module]
        Search[Search Module]
    end
    
    subgraph "External Services"
        WAPI[WhatsApp Cloud API]
        OpenAI[OpenAI Embeddings]
    end
    
    subgraph "Database - PostgreSQL"
        Tables[(Users, Business, Products, Categories)]
        Vectors[(Product Embeddings - pgvector)]
    end
    
    Dashboard --> Router
    Store --> Router
    Router --> API
    API --> Auth
    API --> Business
    API --> Product
    API --> Category
    API --> WhatsApp
    API --> Search
    
    WhatsApp --> WAPI
    Search --> OpenAI
    Search --> Vectors
    
    Auth --> Tables
    Business --> Tables
    Product --> Tables
    Category --> Tables
```

---

## User Flow Diagrams

### Flow 1: Business Onboarding & Product Setup

```mermaid
sequenceDiagram
    actor Business
    participant Dashboard
    participant API
    participant DB
    
    Business->>Dashboard: Sign up (email/password)
    Dashboard->>API: POST /auth/register
    API->>DB: Create user & business
    API-->>Dashboard: JWT token
    
    Business->>Dashboard: Add category
    Dashboard->>API: POST /categories
    API->>DB: Insert category
    
    Business->>Dashboard: Add product (name, price, images, descriptions)
    Dashboard->>API: POST /products (multipart/form-data)
    API->>DB: Insert product
    API->>OpenAI: Generate embedding
    API->>DB: Store embedding in pgvector
    API-->>Dashboard: Product created
```

### Flow 2: Customer WhatsApp Interaction (Simple Category Matching)

```mermaid
sequenceDiagram
    actor Customer
    participant WhatsApp
    participant Webhook
    participant API
    participant DB
    
    Customer->>WhatsApp: Sends "hi"
    WhatsApp->>Webhook: POST /webhook/inbound-message
    Webhook->>API: Process message
    API->>DB: Fetch categories for business
    API->>WhatsApp: Send category list (Interactive List)
    
    Customer->>WhatsApp: Selects "Men's Shoes"
    WhatsApp->>Webhook: POST /webhook/inbound-message (interactive)
    Webhook->>API: Process selection
    API-->>WhatsApp: Send link: yourapp.com/store/business-slug?category=mens-shoes
    
    Customer->>WhatsApp: Clicks link
    Note over Customer: Opens web catalog
```

### Flow 3: AI-Powered Search (Text/Image)

```mermaid
sequenceDiagram
    actor Customer
    participant WhatsApp
    participant Webhook
    participant API
    participant OpenAI
    participant DB
    
    Customer->>WhatsApp: Sends "red running shoes"
    WhatsApp->>Webhook: POST /webhook/inbound-message
    Webhook->>API: Process text message
    API->>OpenAI: Generate embedding for "red running shoes"
    OpenAI-->>API: Embedding vector
    API->>DB: Vector similarity search (pgvector)
    DB-->>API: Top 3 matching products
    API->>WhatsApp: Send link: yourapp.com/store/business-slug?search=red+running+shoes
    
    Note over Customer: Alternative flow with image
    Customer->>WhatsApp: Sends shoe image
    WhatsApp->>Webhook: POST /webhook/inbound-message (image)
    Webhook->>API: Download image, extract text/description
    API->>OpenAI: Generate embedding from image description
    API->>DB: Vector similarity search
    API->>WhatsApp: Send store link with search results
```

### Flow 4: Web Catalog & WhatsApp Order

```mermaid
sequenceDiagram
    actor Customer
    participant Store
    participant API
    participant WhatsApp
    
    Customer->>Store: Opens store link
    Store->>API: GET /products?businessSlug=xyz&category=mens-shoes
    API-->>Store: Return products
    
    Customer->>Store: Selects 3 products (checkboxes)
    Customer->>Store: Clicks "Order on WhatsApp"
    
    Store->>Store: Generate WhatsApp message
    Note over Store: "Hi, I want to order:<br/>1. Product A - $50<br/>2. Product B - $30<br/>3. Product C - $40"
    
    Store->>WhatsApp: Redirect to wa.me/business-number?text=encoded-message
    Note over Customer: WhatsApp opens with pre-filled message
    Customer->>WhatsApp: Sends message to business
```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Business : owns
    Business ||--o{ Category : has
    Business ||--o{ Product : has
    Category ||--o{ Product : contains
    Product ||--|| ProductEmbedding : has
    
    User {
        uuid id PK
        string email UK
        string password_hash
        timestamp created_at
        timestamp updated_at
    }
    
    Business {
        uuid id PK
        uuid user_id FK
        string name
        string slug UK
        string whatsapp_number
        string whatsapp_access_token
        string whatsapp_phone_number_id
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    Category {
        uuid id PK
        uuid business_id FK
        string name
        string slug
        integer display_order
        timestamp created_at
        timestamp updated_at
    }
    
    Product {
        uuid id PK
        uuid business_id FK
        uuid category_id FK
        string name
        decimal price
        string line1
        string line2
        string line3
        string[] image_urls
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    ProductEmbedding {
        uuid id PK
        uuid product_id FK
        vector embedding
        string source_text
        timestamp created_at
    }
```

### Key Schema Decisions

- **UUID primary keys**: Better for distributed systems and security
- **Business slug**: Human-readable URLs (`/store/johns-footwear`)
- **Product descriptions**: `line1`, `line2`, `line3` for flexible multi-line descriptions
- **Image URLs**: Array of strings (stored in cloud storage like S3/Cloudinary)
- **pgvector**: `vector` type for embeddings (dimension: 1536 for OpenAI text-embedding-3-small)

---

## Proposed Changes

### Backend Structure

```
backend/
├── src/
│   ├── main.ts                    # Bootstrap NestJS app
│   ├── app.module.ts              # Root module
│   ├── config/
│   │   ├── database.config.ts     # Prisma config
│   │   └── env.config.ts          # Environment validation
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts     # POST /auth/register, /auth/login
│   │   ├── auth.service.ts        # JWT generation, password hashing
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── guards/
│   │       └── jwt-auth.guard.ts
│   ├── business/
│   │   ├── business.module.ts
│   │   ├── business.controller.ts # CRUD for businesses
│   │   ├── business.service.ts
│   │   └── dto/
│   │       ├── create-business.dto.ts
│   │       └── update-business.dto.ts
│   ├── category/
│   │   ├── category.module.ts
│   │   ├── category.controller.ts # CRUD for categories
│   │   ├── category.service.ts
│   │   └── dto/
│   ├── product/
│   │   ├── product.module.ts
│   │   ├── product.controller.ts  # CRUD + image upload
│   │   ├── product.service.ts
│   │   ├── product-embedding.service.ts # Generate embeddings
│   │   └── dto/
│   ├── whatsapp/
│   │   ├── whatsapp.module.ts
│   │   ├── whatsapp.controller.ts # Webhook verification + message handling
│   │   ├── whatsapp.service.ts    # Send messages, process incoming
│   │   └── helpers/
│   │       ├── message-builder.ts # Build interactive lists, text messages
│   │       └── webhook-parser.ts  # Parse WhatsApp webhook payloads
│   ├── search/
│   │   ├── search.module.ts
│   │   ├── search.service.ts      # Vector search, embedding generation
│   │   └── openai.service.ts      # OpenAI API wrapper
│   └── prisma/
│       ├── schema.prisma          # Database schema
│       └── migrations/
├── .env.example
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Root component
│   ├── routes/
│   │   ├── __root.tsx             # Root layout
│   │   ├── index.tsx              # Landing page (optional)
│   │   ├── dashboard/
│   │   │   ├── index.tsx          # Dashboard home
│   │   │   ├── products.tsx       # Product management
│   │   │   └── categories.tsx     # Category management
│   │   └── store/
│   │       └── $businessSlug.tsx  # Public store page
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ProductForm.tsx    # Add/Edit product modal
│   │   │   ├── ProductTable.tsx   # Product list with actions
│   │   │   ├── CategorySelect.tsx # Creatable category select
│   │   │   └── ImageUpload.tsx    # Multi-image upload
│   │   └── store/
│   │       ├── ProductCard.tsx    # Product display with checkbox
│   │       ├── CategoryFilter.tsx # Category sidebar/tabs
│   │       ├── SearchBar.tsx      # Search input
│   │       └── WhatsAppButton.tsx # Generate & redirect to wa.me
│   ├── hooks/
│   │   ├── useProducts.ts         # TanStack Query for products
│   │   ├── useCategories.ts       # TanStack Query for categories
│   │   └── useAuth.ts             # Auth state management
│   ├── services/
│   │   └── api.ts                 # Axios instance with interceptors
│   ├── types/
│   │   ├── product.ts
│   │   ├── category.ts
│   │   └── business.ts
│   └── styles/
│       └── global.css             # Global styles (Ant Design theme)
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Implementation Phases

### Phase 1A: Backend Foundation (Days 1-2)

**Goal**: Set up NestJS with database and authentication

- [ ] Initialize NestJS project with TypeScript
- [ ] Set up Prisma with PostgreSQL
- [ ] Enable pgvector extension
- [ ] Create database schema (User, Business, Category, Product, ProductEmbedding)
- [ ] Implement Auth module (register, login with JWT)
- [ ] Create JWT strategy and guards
- [ ] Set up environment configuration

**Deliverables**:
- Working auth endpoints: `POST /auth/register`, `POST /auth/login`
- Database migrations
- JWT authentication working

### Phase 1B: Frontend Foundation (Days 1-2)

**Goal**: Set up Vite + React with routing and auth

- [ ] Initialize Vite project with React + TypeScript
- [ ] Install and configure TanStack Router
- [ ] Set up Ant Design with glass design theme
- [ ] Create route structure (dashboard, store)
- [ ] Implement auth flow (login, register pages)
- [ ] Set up TanStack Query for API calls
- [ ] Create axios instance with JWT interceptor

**Deliverables**:
- Working login/register UI
- Protected dashboard routes
- API service layer configured

### Phase 2A: Product & Category Management - Backend (Days 3-4)

**Goal**: CRUD operations for products and categories

- [ ] Implement Category module (CRUD endpoints)
- [ ] Implement Product module (CRUD endpoints)
- [ ] Add image upload handling (multipart/form-data)
- [ ] Integrate OpenAI embeddings service
- [ ] Auto-generate embeddings on product create/update
- [ ] Store embeddings in pgvector

**Deliverables**:
- `GET/POST/PUT/DELETE /categories`
- `GET/POST/PUT/DELETE /products`
- `POST /products/upload-images`
- Embeddings automatically generated

### Phase 2B: Product & Category Management - Frontend (Days 3-4)

**Goal**: Dashboard UI for managing products and categories

- [ ] Create ProductTable component with Ant Design Table
- [ ] Create ProductForm modal (add/edit)
- [ ] Implement multi-image upload with preview
- [ ] Create CategorySelect with creatable option
- [ ] Add product description fields (line1, line2, line3)
- [ ] Implement category management page
- [ ] Add loading states and error handling

**Deliverables**:
- Fully functional product management UI
- Category creation and assignment
- Image upload with preview

### Phase 3A: WhatsApp Integration - Backend (Days 5-6)

**Goal**: WhatsApp webhook and message handling

- [ ] Implement WhatsApp module
- [ ] Create webhook verification endpoint (GET)
- [ ] Create webhook message handler (POST)
- [ ] Parse incoming messages (text, interactive, image)
- [ ] Build message helpers (interactive list, text with link)
- [ ] Implement category matching logic
- [ ] Store WhatsApp credentials in Business model
- [ ] Send category list on "hi" or any text
- [ ] Send store link on category selection

**Deliverables**:
- `GET /whatsapp/webhook` (verification)
- `POST /whatsapp/webhook` (message handling)
- Category list sent as Interactive List
- Store link sent on selection

### Phase 3B: Public Store Page - Frontend (Days 5-6)

**Goal**: Customer-facing product catalog

- [ ] Create store route with businessSlug param
- [ ] Fetch products by businessSlug
- [ ] Implement category filtering (query params)
- [ ] Create ProductCard with checkbox selection
- [ ] Build CategoryFilter component
- [ ] Implement SearchBar (query params)
- [ ] Create WhatsAppButton component
- [ ] Generate WhatsApp message from selected products
- [ ] Redirect to wa.me with encoded message
- [ ] Add glass design styling

**Deliverables**:
- Working store page: `/store/johns-footwear`
- Category filtering: `?category=mens-shoes`
- Product selection and WhatsApp redirect

### Phase 4: AI Search Integration (Days 7-8)

**Goal**: Embeddings-based search for text and images

**Backend**:
- [ ] Implement Search module
- [ ] Create OpenAI service wrapper
- [ ] Add text embedding generation
- [ ] Add image-to-text conversion (OpenAI Vision)
- [ ] Implement pgvector similarity search
- [ ] Update WhatsApp handler to detect search queries
- [ ] Return store link with search param

**Frontend**:
- [ ] Add search query param handling
- [ ] Display search results on store page
- [ ] Show "Searched for: X" indicator
- [ ] Highlight matching products

**WhatsApp Flow**:
- [ ] Detect text messages (not category names)
- [ ] Generate embedding and search
- [ ] Send link: `?search=red+shoes`
- [ ] Handle image messages
- [ ] Extract image description
- [ ] Generate embedding and search

**Deliverables**:
- Text search working via WhatsApp
- Image search working via WhatsApp
- Search results displayed on store page

### Phase 5: Testing & Polish (Days 9-10)

**Goal**: End-to-end testing and UX improvements

- [ ] Test complete user flows
- [ ] Add loading skeletons (Ant Design Skeleton)
- [ ] Improve error messages
- [ ] Add empty states
- [ ] Test WhatsApp integration with real phone number
- [ ] Optimize image loading
- [ ] Add responsive design for mobile
- [ ] Test on different browsers
- [ ] Add basic analytics (optional)
- [ ] Write deployment documentation

**Deliverables**:
- Fully tested MVP
- Deployment-ready application
- User documentation

---

## Technical Decisions & Rationale

### Why TanStack Router over React Router?

- **Type-safe routing**: Better TypeScript support
- **Built-in search params**: First-class support for query params
- **File-based routing**: Cleaner structure
- **Better performance**: Code-splitting out of the box

### Why No Global State Library?

- **React state is sufficient**: Simple forms and UI state
- **TanStack Query handles server state**: Caching, refetching, optimistic updates
- **URL params for filters**: Shareable, bookmarkable state
- **Avoids over-engineering**: Less boilerplate, easier to understand

### Why Ant Design?

- **Rich component library**: Less custom code needed
- **Glass design support**: Modern, premium look
- **Form handling**: Built-in validation and state management
- **Table component**: Perfect for product management
- **Upload component**: Multi-image upload out of the box

### Why Prisma?

- **Type-safe queries**: Auto-generated TypeScript types
- **Migration system**: Version-controlled schema changes
- **pgvector support**: Works with PostgreSQL extensions
- **Developer experience**: Intuitive API, great documentation

### Why pgvector over Pinecone/Weaviate?

- **No additional service**: One less thing to manage
- **Cost-effective**: No separate vector DB subscription
- **Good enough for MVP**: Handles thousands of products easily
- **PostgreSQL native**: Simpler architecture

### Why OpenAI Embeddings?

- **Best quality**: State-of-the-art embeddings
- **Image support**: Vision API for image-to-text
- **Simple API**: Easy to integrate
- **Cost-effective**: text-embedding-3-small is cheap

---

## WhatsApp Integration Details

### Message Flow Architecture

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> ReceiveMessage: User sends message
    ReceiveMessage --> ParseMessage: Extract type & content
    
    ParseMessage --> TextMessage: type = text
    ParseMessage --> InteractiveMessage: type = interactive
    ParseMessage --> ImageMessage: type = image
    
    TextMessage --> CheckContent: Analyze text
    CheckContent --> SendCategoryList: Generic message (hi, hello)
    CheckContent --> SearchProducts: Specific query (red shoes)
    
    InteractiveMessage --> CheckSelection: Get selection ID
    CheckSelection --> SendCategoryList: "More..." pagination
    CheckSelection --> SendStoreLink: Category selected
    
    ImageMessage --> ExtractDescription: OpenAI Vision
    ExtractDescription --> SearchProducts: Generate embedding
    
    SendCategoryList --> [*]
    SendStoreLink --> [*]
    SearchProducts --> SendStoreLink
```

### WhatsApp Message Templates

**1. Category List (Interactive List)**

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Welcome to John's Footwear"
    },
    "body": {
      "text": "Please select a category to browse products:"
    },
    "footer": {
      "text": "Choose from the list below"
    },
    "action": {
      "button": "View Categories",
      "sections": [
        {
          "title": "Collections",
          "rows": [
            {
              "id": "mens-shoes",
              "title": "Men's Shoes",
              "description": ""
            },
            {
              "id": "womens-shoes",
              "title": "Women's Shoes",
              "description": ""
            },
            {
              "id": "KEY_MORE_p_2",
              "title": "More...",
              "description": "Page 1/3"
            }
          ]
        }
      ]
    }
  }
}
```

**2. Store Link (Text Message)**

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": {
    "body": "Click the link below to view *Men's Shoes* collection:\n\nhttps://yourapp.com/store/johns-footwear?category=mens-shoes",
    "preview_url": true
  }
}
```

**3. Search Results Link**

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": {
    "body": "I found some products matching 'red running shoes':\n\nhttps://yourapp.com/store/johns-footwear?search=red+running+shoes",
    "preview_url": true
  }
}
```

### Webhook Payload Parsing

**Incoming Text Message**:
```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "919876543210",
                "type": "text",
                "text": {
                  "body": "hi"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Incoming Interactive Message**:
```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "919876543210",
                "type": "interactive",
                "interactive": {
                  "type": "list_reply",
                  "list_reply": {
                    "id": "mens-shoes",
                    "title": "Men's Shoes"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_saas?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# WhatsApp Cloud API
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your-webhook-verify-token"

# OpenAI
OPENAI_API_KEY="sk-..."

# File Upload (optional - use local storage for MVP)
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880  # 5MB

# Server
PORT=3000
NODE_ENV="development"
```

### Frontend (.env)

```env
VITE_API_URL="http://localhost:3000"
```

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |

### Business

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/business/me` | Get current user's business | Yes |
| PUT | `/business/me` | Update business details | Yes |

### Categories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/categories` | Get all categories | Yes |
| POST | `/categories` | Create category | Yes |
| PUT | `/categories/:id` | Update category | Yes |
| DELETE | `/categories/:id` | Delete category | Yes |

### Products

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get all products (with filters) | Yes |
| GET | `/products/:id` | Get single product | Yes |
| POST | `/products` | Create product | Yes |
| PUT | `/products/:id` | Update product | Yes |
| DELETE | `/products/:id` | Delete product | Yes |
| POST | `/products/upload-images` | Upload product images | Yes |

### Public Store

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/store/:slug/products` | Get products by business slug | No |
| GET | `/store/:slug/categories` | Get categories by business slug | No |

### WhatsApp

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/whatsapp/webhook` | Webhook verification | No |
| POST | `/whatsapp/webhook` | Incoming messages | No |

### Search

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/search/products` | Search products (for store page) | No |

---

## Verification Plan

### Automated Tests

**Backend**:
```bash
# Unit tests for services
npm run test

# E2E tests for API endpoints
npm run test:e2e

# Test coverage
npm run test:cov
```

**Frontend**:
```bash
# Component tests (optional for MVP)
npm run test
```

### Manual Verification

#### 1. Authentication Flow
- [ ] Register new user with email/password
- [ ] Login with correct credentials
- [ ] Login fails with wrong credentials
- [ ] JWT token stored in localStorage
- [ ] Protected routes redirect to login
- [ ] Logout clears token

#### 2. Product Management
- [ ] Create new category
- [ ] Create product with multiple images
- [ ] Add 3 description lines (line1, line2, line3)
- [ ] Assign category to product
- [ ] Edit product details
- [ ] Delete product
- [ ] View product list in table

#### 3. WhatsApp Integration
- [ ] Set up WhatsApp webhook in Meta dashboard
- [ ] Verify webhook with GET request
- [ ] Send "hi" to WhatsApp number
- [ ] Receive category list (Interactive List)
- [ ] Select category from list
- [ ] Receive store link
- [ ] Click link and verify it opens store page

#### 4. Public Store Page
- [ ] Open store page with businessSlug
- [ ] Products load correctly
- [ ] Filter by category using query param
- [ ] Select multiple products with checkboxes
- [ ] Click "Order on WhatsApp"
- [ ] Verify WhatsApp opens with pre-filled message
- [ ] Message contains selected products

#### 5. AI Search
- [ ] Send text message "red shoes" to WhatsApp
- [ ] Receive store link with search param
- [ ] Open link and verify search results
- [ ] Send image of a shoe to WhatsApp
- [ ] Receive store link with search results
- [ ] Verify relevant products are shown

#### 6. Edge Cases
- [ ] No products in category shows empty state
- [ ] Invalid businessSlug shows 404
- [ ] Large number of categories (pagination in WhatsApp list)
- [ ] Product with no images shows placeholder
- [ ] Search with no results shows empty state

### Performance Checks
- [ ] Store page loads in < 2 seconds
- [ ] Image upload completes in < 5 seconds
- [ ] WhatsApp response time < 3 seconds
- [ ] Vector search completes in < 500ms

---

## Deployment Considerations (Out of Scope for Phase 1)

> [!NOTE]
> These are future considerations, not part of the MVP implementation.

- **Backend**: Deploy to Railway, Render, or DigitalOcean
- **Frontend**: Deploy to Vercel or Netlify
- **Database**: Managed PostgreSQL (Supabase, Neon, or Railway)
- **File Storage**: Cloudinary or AWS S3
- **Environment Variables**: Set in deployment platform
- **WhatsApp Webhook**: Must use HTTPS URL

---

## Success Metrics for MVP

1. **Functional Completeness**:
   - ✅ Business can register and login
   - ✅ Business can add products with images and categories
   - ✅ Customer can interact via WhatsApp
   - ✅ Customer can browse products on web
   - ✅ Customer can order via WhatsApp

2. **Performance**:
   - ✅ Store page loads in < 2 seconds
   - ✅ WhatsApp responses in < 3 seconds
   - ✅ Search results in < 1 second

3. **User Experience**:
   - ✅ Intuitive dashboard UI
   - ✅ Beautiful store page (glass design)
   - ✅ Smooth WhatsApp flow
   - ✅ Mobile-responsive

---

## What We're NOT Building (Phase 1)

> [!IMPORTANT]
> These features are explicitly out of scope to keep the MVP lean.

- ❌ Payment integration
- ❌ Order management system
- ❌ Inventory tracking
- ❌ Multi-user roles (admin, staff)
- ❌ Analytics dashboard
- ❌ Email notifications
- ❌ SMS notifications
- ❌ Social auth (Google, Facebook)
- ❌ Multi-language support
- ❌ Advanced WhatsApp flows (buttons, carousels)
- ❌ Customer database
- ❌ Order history
- ❌ Shipping integration
- ❌ Tax calculations
- ❌ Discount codes
- ❌ Product variants (size, color)

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1A-1B | Days 1-2 | Auth + Basic Setup |
| 2A-2B | Days 3-4 | Product & Category Management |
| 3A-3B | Days 5-6 | WhatsApp + Store Page |
| 4 | Days 7-8 | AI Search |
| 5 | Days 9-10 | Testing & Polish |

**Total**: 10 working days for a fully functional MVP

---

## Next Steps

1. **Review this plan**: Ensure alignment with your vision
2. **Set up development environment**: Install Node.js, PostgreSQL, etc.
3. **Create project repositories**: Separate repos for frontend and backend
4. **Start with Phase 1A**: Backend foundation
5. **Parallel development**: Frontend and backend can be built simultaneously

---

## Questions for Clarification

> [!WARNING]
> Please review these questions before we proceed with implementation.

1. **WhatsApp Business Account**: Do you already have a WhatsApp Business API account set up with Meta?
2. **Image Storage**: Should we use local file storage for MVP or integrate cloud storage (Cloudinary/S3)?
3. **Business Model**: Will each user have only ONE business, or can a user manage multiple businesses?
4. **Category Limit**: What's the maximum number of categories per business? (WhatsApp Interactive List has a 10-row limit)
5. **Product Limit**: Expected number of products per business? (Affects pagination strategy)
6. **Search Behavior**: Should text search be triggered only for non-category names, or should we have a specific keyword like "search: red shoes"?
7. **Image Search**: Should we support image search in Phase 1, or defer to Phase 2?

---

## Conclusion

This implementation plan provides a clear, actionable roadmap for building a lean, functional MVP. The architecture is simple, the tech stack is modern, and the scope is tightly controlled to avoid over-engineering.

**Key Principles**:
- ✅ Ship fast, iterate later
- ✅ Use existing libraries (Ant Design, TanStack)
- ✅ No premature optimization
- ✅ Focus on core user flows
- ✅ Keep it simple

Let's build this! 🚀
