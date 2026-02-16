# WhatsApp SaaS MVP - Bot Uncle

A lean SaaS platform enabling small businesses to sell products via WhatsApp with a web-based catalog.

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   ```bash
   # Check if installed
   node --version
   
   # If not installed, download from: https://nodejs.org/
   # Or use nvm (recommended):
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **PostgreSQL** (v14 or higher)
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@14
   brew services start postgresql@14
   
   # Create database
   createdb whatsapp_saas
   ```

3. **pgvector Extension**
   ```bash
   # macOS (using Homebrew)
   brew install pgvector
   
   # Then in PostgreSQL:
   psql whatsapp_saas
   CREATE EXTENSION vector;
   ```

### Installation Steps

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize Prisma
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run start:dev
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## 📁 Project Structure

```
bot_uncle_v0/
├── backend/          # NestJS backend
├── frontend/         # Vite + React frontend
├── idea.md          # Implementation plan
└── README.md        # This file
```

## 🔧 Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_saas?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your-webhook-token"
OPENAI_API_KEY="sk-..."
PORT=3000
NODE_ENV="development"
```

### Frontend (.env)

```env
VITE_API_URL="http://localhost:3000"
```

## 📚 Documentation

- **Implementation Plan**: See `idea.md` for detailed architecture and implementation phases
- **Detailed TODO**: Check the artifacts directory for granular task breakdown
- **API Reference**: See `idea.md` for complete API endpoint documentation

## 🎯 Development Phases

1. **Phase 1 (Days 1-2)**: Backend & Frontend Foundation
2. **Phase 2 (Days 3-4)**: Product & Category Management
3. **Phase 3 (Days 5-6)**: WhatsApp Integration & Store Page
4. **Phase 4 (Days 7-8)**: AI Search
5. **Phase 5 (Days 9-10)**: Testing & Polish

## 🛠️ Tech Stack

**Backend:**
- NestJS
- Prisma ORM
- PostgreSQL + pgvector
- OpenAI API

**Frontend:**
- Vite + React + TypeScript
- TanStack Router
- TanStack Query
- Ant Design

## 📞 WhatsApp Setup

1. Create Meta Developer account
2. Create WhatsApp Business App
3. Get credentials:
   - Phone Number ID
   - Access Token
   - Webhook Verify Token
4. Configure webhook URL in Meta Dashboard

## 🚧 Current Status

- ✅ Implementation plan created
- ✅ Project structure defined
- ⏳ Awaiting Node.js installation
- ⏳ Backend initialization pending
- ⏳ Frontend initialization pending

## 📝 Next Steps

1. Install Node.js and npm
2. Install PostgreSQL with pgvector
3. Run backend setup commands
4. Run frontend setup commands
5. Configure environment variables
6. Start development!

## 🤝 Contributing

This is a Phase-1 MVP. Keep it simple, avoid over-engineering.

## 📄 License

MIT
