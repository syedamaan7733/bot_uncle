# Setup Guide - Bot Uncle WhatsApp SaaS

## ⚠️ Important: Install Prerequisites First

Before proceeding with the implementation, you need to install the following:

### 1. Install Node.js and npm

**Option A: Using nvm (Recommended)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js v18
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

**Option B: Direct Download**
- Download from: https://nodejs.org/
- Install the LTS version (v18 or higher)

### 2. Install PostgreSQL

**macOS (using Homebrew)**
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb whatsapp_saas
```

### 3. Install pgvector Extension

```bash
# Install pgvector
brew install pgvector

# Enable in your database
psql whatsapp_saas
```

Then in the PostgreSQL prompt:
```sql
CREATE EXTENSION vector;
\q
```

## 🚀 Once Prerequisites are Installed

After installing Node.js, PostgreSQL, and pgvector, run:

```bash
# Navigate to project directory
cd /Users/amaan7733/Dev/temp/bot_uncle_v0

# Initialize backend
cd backend
npm init -y
npm install @nestjs/cli -g
nest new . --skip-git

# Install backend dependencies
npm install @prisma/client prisma
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt class-validator class-transformer @nestjs/config
npm install -D @types/bcrypt @types/passport-jwt

# Initialize Prisma
npx prisma init

# Initialize frontend
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install @tanstack/react-router @tanstack/react-query antd axios
```

## 📋 Current Status

✅ Implementation plan copied to `idea.md`
✅ README.md created with setup instructions
✅ Project structure defined
⏳ **BLOCKED: Node.js not installed**

## 🎯 Next Action Required

**Please install Node.js and npm first, then let me know to continue with the implementation.**

You can verify installation by running:
```bash
node --version
npm --version
```

Once these commands work, I'll proceed with:
1. Backend initialization (NestJS + Prisma)
2. Database schema creation
3. Auth module implementation
4. Frontend initialization (Vite + React)
5. And all subsequent phases...
