# AlChemist_SEO – Production-Ready Platform

A production-ready SEO platform for your client. Keyword research, site audit, position tracking, and reporting tools.

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
- **Subscriptions** – Stripe checkout + customer billing portal
- **Settings** – View DataForSEO service status and billing controls
- **CSV Export** – Export keywords to CSV

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup and Vercel deployment.

## Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Yes | Clerk publishable key |
| CLERK_SECRET_KEY | Yes | Clerk secret key |
| STRIPE_SECRET_KEY | Optional** | Stripe secret key for subscriptions |
| STRIPE_PRICE_ID | Optional** | Stripe recurring price id |
| STRIPE_WEBHOOK_SECRET | Optional** | Stripe webhook signing secret |
| NEXT_PUBLIC_APP_URL | Optional** | Public app URL used by Stripe redirects |
| DATA_FOR_SEO_API_KEY | Yes* | DataForSEO API key |
| OPENAI_API_KEY | Optional | Enables LLM-based AI content generation |
| OPENAI_MODEL | Optional | OpenAI-compatible model name (default `gpt-4o-mini`) |
| OPENAI_BASE_URL | Optional | Custom OpenAI-compatible base URL |

*Set by the account owner in server environment variables.

**Required only if you enable paid subscriptions.

## License

MIT
