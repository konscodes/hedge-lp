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

3. **Add to Vercel**:
   - Go to your Vercel project → Settings → Environment Variables
   - Add `DATABASE_URL` with your Turso connection string
   - Make sure to add it for **Production**, **Preview**, and **Development** environments

**That's it!** No schema changes needed - Turso uses the same SQLite provider.

### Step 3: Deploy

1. Vercel will automatically detect Next.js
2. The `vercel.json` file configures the build command (includes Prisma migrations)
3. Click "Deploy"
4. Wait for build to complete

**Migrations run automatically** - The build command includes `prisma migrate deploy`, so your database schema will be set up automatically on first deployment.

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

