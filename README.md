# SEO Tools – Production-Ready Platform

A Semrush-like SEO platform for your client. Keyword research, site audit, position tracking, backlinks analysis.

## 🚀 Start Here

**Read [YOUR_INPUT_REQUIRED.md](./YOUR_INPUT_REQUIRED.md)** – step-by-step guide for what you need to do.

## Requirements

- **PostgreSQL** – [Neon](https://neon.tech) (free)
- **Clerk** – [clerk.com](https://clerk.com) (free)
- **DataForSEO** – [dataforseo.com](https://dataforseo.com) (pay-as-you-go)

## Quick Start (after filling .env)

```bash
npm install
npx prisma migrate deploy
npm run dev
```

## Features

- **Projects** – Organize sites and keywords
- **Keyword Research** – Related keywords, volume, difficulty (DataForSEO)
- **Site Audit** – Crawl any URL, get SEO recommendations
- **Audit History** – View past audits
- **Position Tracking** – Check Google rankings for keywords
- **Backlinks** – Analyze backlink profile
- **Settings** – Add DataForSEO in Settings (no env editing needed)
- **CSV Export** – Export keywords to CSV

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup and Vercel deployment.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | Clerk publishable key |
| CLERK_SECRET_KEY | Yes | Clerk secret key |
| DATA_FOR_SEO_LOGIN | Yes* | DataForSEO login |
| DATA_FOR_SEO_PASSWORD | Yes* | DataForSEO password |

*Can be added in Settings after sign-in.

## License

MIT
