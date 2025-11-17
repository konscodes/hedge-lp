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

### Step 2: Set Up Turso (Hosted SQLite)

**Why Turso?** SQLite file-based databases don't work on Vercel's serverless functions. Turso provides hosted SQLite with the same Prisma setup - no code changes needed!

1. **Create a Turso database**:
   - Go to [turso.tech](https://turso.tech) and sign in
   - Click "Create Database"
   - Choose a name and region
   - Click "Create"

2. **Get your connection string**:
   - Click on your database
   - Go to "Connect" tab
   - Copy the connection string (looks like `libsql://your-db-name.turso.io`)

3. **Get your auth token** (REQUIRED):
   - Go to your Turso database dashboard
   - Click on your database → "Settings" → "Tokens"
   - Click "Create Token" or copy an existing token
   - **Important:** Turso requires authentication - the connection will fail without this token

4. **Add to Vercel**:
   - Go to your Vercel project → Settings → Environment Variables
   - Add `DATABASE_URL` with your Turso connection string (e.g., `libsql://your-db-name.turso.io`)
   - Add `TURSO_AUTH_TOKEN` with your Turso auth token
   - Make sure to add both for **Production**, **Preview**, and **Development** environments

**That's it!** No schema changes needed - Turso uses the same SQLite provider.

### Step 3: Apply Database Schema to Turso

**Important:** Prisma's SQLite provider validates URL format and requires `file:` protocol, so we need to apply the schema manually to Turso before deployment.

**Option 1: Using Turso Dashboard (Easiest)**
1. Go to your Turso database dashboard
2. Click on your database → "Shell" or "Query" tab
3. Copy and paste the SQL from `scripts/setup-turso-schema.sql`
4. Run the SQL to create tables

**Option 2: Using Turso CLI**
```bash
# Install Turso CLI if you haven't
curl -sSfL https://get.tur.so/install.sh | bash

# Apply schema
turso db shell hedge-lp-konscodes < scripts/setup-turso-schema.sql
```

**Option 3: One-time SQL execution**
You can also run the SQL directly in Turso dashboard's SQL editor.

### Step 4: Deploy

1. Vercel will automatically detect Next.js
2. The `vercel.json` file configures the build command
3. Click "Deploy"
4. Wait for build to complete

**Note:** The build will skip schema deployment for Turso (to avoid Prisma validation errors) and only generate the Prisma client. Make sure you've applied the schema manually in Step 3.

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

## 💡 Why Turso Instead of Postgres?

- **Same Prisma setup**: Uses SQLite provider, no schema changes needed
- **Zero code changes**: Your existing code works as-is
- **Free tier**: Perfect for demos and small projects
- **Simple setup**: Just copy-paste the connection string
- **Works on Vercel**: Unlike file-based SQLite, Turso works perfectly with serverless functions

## 🐛 Troubleshooting

### Build Fails
- Check that `DATABASE_URL` is set in Vercel environment variables
- Verify Prisma client is generated (check build logs)
- Ensure all dependencies are in `package.json`

### Database Connection Issues
- Verify `DATABASE_URL` format is correct (should start with `libsql://`)
- Check Turso dashboard to ensure database is active
- Verify environment variable is set for the correct environment (Production/Preview/Development)
- Try regenerating the connection string in Turso if needed

### Migration Issues
- Migrations run automatically during build (configured in `vercel.json`)
- If migrations fail, check Turso dashboard for database status
- Verify `DATABASE_URL` is correctly set in Vercel environment variables
- Check build logs in Vercel dashboard for migration errors

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

