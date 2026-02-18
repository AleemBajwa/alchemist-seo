# YOUR INPUT REQUIRED

Everything is built. You only need to complete these steps to go live.

---

## Step 1: Create a Neon Database (2 min)

1. Go to **https://neon.tech** and sign up (free).
2. Click **New Project** → choose a name → **Create**.
3. On the dashboard, copy the **Connection string** (starts with `postgresql://`).
4. Paste it into your `.env` file as `DATABASE_URL`:

```
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
```

---

## Step 2: Create Clerk Account (2 min)

1. Go to **https://clerk.com** and sign up (free).
2. Click **Add application** → choose a name → **Create**.
3. Go to **API Keys** in the sidebar.
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`
   - **Secret key** → `CLERK_SECRET_KEY` in `.env`
5. Go to **Paths** → set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/`
   - After sign-up: `/`

---

## Step 3: Create DataForSEO Account (2 min)

1. Go to **https://dataforseo.com** and sign up.
2. Add funds (pay-as-you-go, small amount is fine to start).
3. Go to **API** and copy your **API key/token**.
5. Add to `.env`:

```
DATA_FOR_SEO_API_KEY=your_dataforseo_api_key
```

This key should be set by the account owner in server environment variables.

---

## Step 4: Fill Your .env File

Open `d:\Semrush\seo-tools\.env` and ensure it looks like this (with your real values):

```
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
DATA_FOR_SEO_API_KEY=your_dataforseo_api_key
```

---

## Step 5: Run Migrations

In a terminal:

```bash
cd d:\Semrush\seo-tools
npx prisma migrate deploy
```

---

## Step 6: Build and Run

```bash
npm run build
npm run dev
```

Open **http://localhost:3000**. Sign up with your email to create the first account.

---

## Step 7: Deploy to Vercel (Optional)

1. Push the code to **GitHub**.
2. Go to **https://vercel.com** → **Import** your repo.
3. Add the same environment variables (from Step 4).
4. Deploy.

---

## Checklist

- [ ] Neon: DATABASE_URL in .env
- [ ] Clerk: both keys in .env
- [ ] DataForSEO: API key in .env
- [ ] Ran `npx prisma migrate deploy`
- [ ] Ran `npm run build`
- [ ] Ran `npm run dev` and signed up

---

## Support

- **Setup status:** Visit `/setup` in the app to see what’s configured.
- **Docs:** See `README.md` and `DEPLOYMENT.md` in the project folder.
