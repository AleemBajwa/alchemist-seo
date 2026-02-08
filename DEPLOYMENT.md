# Deployment Guide – Client-Ready SEO Tools

This guide covers deploying the SEO Tools platform for your client.

## Build requirements

The build requires all environment variables to be set. Add them to `.env` before running `npm run build`, or configure them in your hosting platform (e.g. Vercel) before the first deploy.

## Prerequisites

1. **Neon** (database) – [neon.tech](https://neon.tech) – free tier
2. **Clerk** (auth) – [clerk.com](https://clerk.com) – free tier
3. **DataForSEO** (data) – [dataforseo.com](https://dataforseo.com) – pay per use
4. **Vercel** (hosting) – [vercel.com](https://vercel.com) – free tier

## Step 1: Database (Neon)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (PostgreSQL)
4. Add to environment variables as `DATABASE_URL`

## Step 2: Clerk

1. Sign up at [clerk.com](https://clerk.com)
2. Create an application
3. Add Sign-in and Sign-up URLs: `https://yourdomain.com/sign-in`, `https://yourdomain.com/sign-up`
4. Copy from API Keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

## Step 3: DataForSEO

1. Sign up at [dataforseo.com](https://dataforseo.com)
2. Add funds (pay-as-you-go)
3. Copy Login and Password from dashboard
4. Add as `DATA_FOR_SEO_LOGIN` and `DATA_FOR_SEO_PASSWORD`
   - Or: client can add in Settings after sign-in

## Step 4: Deploy to Vercel

1. Push code to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATA_FOR_SEO_LOGIN` (optional if using Settings)
   - `DATA_FOR_SEO_PASSWORD` (optional if using Settings)
4. Deploy

## Step 5: Run Migrations

After first deploy, run migrations against your Neon database:

```bash
DATABASE_URL="your-neon-url" npx prisma migrate deploy
```

Or add a build script that runs migrations (Vercel supports `prisma migrate deploy` in postinstall).

## Client Handoff

1. Share the deployed URL
2. Create the first admin user (sign up)
3. If not using env vars: have client add DataForSEO in Settings
4. Share `/setup` for configuration status

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | Neon PostgreSQL connection string |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | From Clerk dashboard |
| CLERK_SECRET_KEY | Yes | From Clerk dashboard |
| DATA_FOR_SEO_LOGIN | Yes* | From DataForSEO or Settings |
| DATA_FOR_SEO_PASSWORD | Yes* | From DataForSEO or Settings |

*Can be added in Settings UI after sign-in.
