# Deployment Checklist

This document outlines the steps to deploy the Hedge LP Dashboard to GitHub and Vercel.

## ✅ Pre-Deployment Checklist

- [x] Code cleanup completed
- [x] `.gitignore` updated to exclude sensitive files
- [x] `.env.example` created
- [x] `README.md` updated with comprehensive documentation
- [x] `LICENSE` file added
- [x] `vercel.json` configured
- [x] `package.json` updated with proper scripts
- [x] Build tested and verified

## 🚀 GitHub Setup

1. **Initialize Git repository** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit: Hedge LP Dashboard"
```

2. **Add remote repository**:
```bash
git remote add origin https://github.com/konscodes/hedge-lp.git
```

3. **Push to GitHub**:
```bash
git branch -M main
git push -u origin main
```

## 🌐 Vercel Deployment

### Step 1: Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository (`konscodes/hedge-lp`)

### Step 2: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```
DATABASE_URL=your_database_url_here
```

**For Production (Recommended):**
- Use Vercel Postgres:
  1. Go to your Vercel project → Storage
  2. Click "Create Database" → "Postgres"
  3. Copy the connection string
  4. Use it as `DATABASE_URL`

**For Testing (SQLite - Not Recommended for Production):**
- SQLite won't work well on Vercel's serverless functions
- Consider using a hosted SQLite service or switch to Postgres

### Step 3: Update Prisma Schema (if using Postgres)

If you're using Postgres instead of SQLite, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then commit and push:
```bash
git add prisma/schema.prisma
git commit -m "Update schema for Postgres"
git push
```

### Step 4: Deploy

1. Vercel will automatically detect Next.js
2. The `vercel.json` file configures the build command
3. Click "Deploy"
4. Wait for build to complete

### Step 5: Run Migrations

After deployment, run database migrations:

**Option 1: Using Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
npx prisma migrate deploy
```

**Option 2: Using Vercel Dashboard**
- Go to your project → Settings → Environment Variables
- Ensure `DATABASE_URL` is set
- Use Vercel's CLI or connect via SSH to run migrations

**Option 3: Add migration to build (already configured)**
- The `vercel.json` already includes `prisma migrate deploy` in the build command
- Migrations will run automatically on each deployment

## 🔧 Post-Deployment

1. **Verify the deployment**:
   - Visit your Vercel URL
   - Test creating a strategy
   - Test logging a snapshot

2. **Monitor logs**:
   - Check Vercel dashboard for any errors
   - Monitor function logs for API routes

3. **Set up custom domain** (optional):
   - Go to Project Settings → Domains
   - Add your custom domain

## 🐛 Troubleshooting

### Build Fails
- Check that `DATABASE_URL` is set in Vercel environment variables
- Verify Prisma client is generated (check build logs)
- Ensure all dependencies are in `package.json`

### Database Connection Issues
- Verify `DATABASE_URL` format is correct
- For Postgres: Ensure connection string includes SSL parameters if needed
- Check database is accessible from Vercel's IP ranges

### Migration Issues
- Run `prisma migrate deploy` manually after deployment
- Check migration files are committed to Git
- Verify database schema matches migrations

## 📝 Notes

- The `postinstall` script in `package.json` automatically generates Prisma client
- The build command includes Prisma generation and migrations
- SQLite files are excluded from Git (see `.gitignore`)
- Environment variables are excluded from Git (see `.gitignore`)

## 🔐 Security Reminders

- Never commit `.env` files
- Use Vercel's environment variables for sensitive data
- Use strong database passwords
- Consider adding authentication for production use
- Review API routes for proper error handling

