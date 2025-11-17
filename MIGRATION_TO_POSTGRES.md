# Migration Plan: SQLite/Turso → Postgres (Neon)

## Why Switch?

The Prisma LibSQL adapter has persistent issues with URL validation in serverless environments. Switching to Postgres (Neon) will:
- ✅ Eliminate adapter complexity
- ✅ Work reliably on Vercel
- ✅ Provide better performance and features
- ✅ Have better community support

## Steps

### 1. Create Neon Database
1. Go to https://neon.tech
2. Sign up/login
3. Create new project
4. Copy connection string (postgresql://...)

### 2. Update Prisma Schema
Change `provider` from `sqlite` to `postgresql`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Update Environment Variables
- Vercel: Update `DATABASE_URL` to Neon connection string
- Local: Update `.env` to Neon connection string

### 4. Generate New Migration
```bash
npx prisma migrate dev --name init_postgres
```

### 5. Deploy
- Push to GitHub
- Vercel will auto-deploy

## Benefits
- No adapter needed
- Native Prisma support
- Better performance
- More features (JSON, arrays, etc.)
- Free tier: 0.5GB storage

