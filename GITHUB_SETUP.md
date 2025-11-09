# GitHub Setup Guide

## Step 1: Fix Dependencies

First, make sure your `package.json` has the correct `react-scripts` version (should be `5.0.1`, not `^0.0.0`).

## Step 2: Initialize Git Repository

If you haven't already initialized git:

```bash
cd "d:\ai recomender system"
git init
```

## Step 3: Add All Files

```bash
git add .
```

## Step 4: Create Initial Commit

```bash
git commit -m "Initial commit: Transport Recommender System with AI recommendations"
```

## Step 5: Connect to GitHub Repository

Connect your local repository to the GitHub repository:

```bash
git remote add origin https://github.com/bvggies/recommendersystem.git
```

## Step 6: Push to GitHub

```bash
git branch -M main
git push -u origin main
```

## Step 7: Verify

Check your GitHub repository at: https://github.com/bvggies/recommendersystem

You should see all your files uploaded.

## Important Notes

### Before Pushing:

1. **Never commit sensitive files!** Make sure `.env` files are in `.gitignore`
2. **Check `.gitignore`** - It should include:
   - `.env`
   - `.env.local`
   - `node_modules/`
   - `server/node_modules/`
   - `build/`

3. **Environment Variables** - You'll need to set these in:
   - **Vercel** (for deployment)
   - **GitHub Secrets** (if using GitHub Actions)

### Files to Keep Private:

- `server/.env` - Contains database credentials and API keys
- Any file with sensitive information

### Files Already in .gitignore:

✅ `.env` files
✅ `node_modules/`
✅ Build directories

## Next Steps After GitHub Setup

1. **Deploy to Vercel:**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables
   - Deploy

2. **Set up Database:**
   - Create Neon PostgreSQL database
   - Run the schema from `server/db/schema.sql`
   - Add `DATABASE_URL` to Vercel environment variables

3. **Configure Environment Variables in Vercel:**
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `JWT_SECRET` - A strong random string
   - `GROQ_API_KEY` - Your Groq API key
   - `REACT_APP_API_URL` - Your Vercel API URL (after deployment)

## Troubleshooting

### If you get "repository not found":
- Make sure the repository exists at https://github.com/bvggies/recommendersystem
- Check that you have write access to the repository

### If you get authentication errors:
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys for GitHub

### If push is rejected:
- Make sure the repository is empty or you're okay with overwriting
- Use `git push -u origin main --force` (only if repository is empty/new)

