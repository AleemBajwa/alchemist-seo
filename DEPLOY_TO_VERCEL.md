# Deploy to Vercel – Step by Step

Follow these steps to deploy and hand over to your client.

---

## Step 1: Push to GitHub

1. Open a terminal in `d:\Semrush\seo-tools`
2. Initialize git (if not done):
   ```bash
   git init
   git add .
   git commit -m "SEO Tools - client ready"
   ```
3. Create a new repo on GitHub: https://github.com/new
4. Name it (e.g. `seo-tools`)
5. Don’t add README, .gitignore, or license (project already has them)
6. Push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/seo-tools.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Deploy to Vercel

1. Go to **https://vercel.com** and sign in (use GitHub)
2. Click **Add New…** → **Project**
3. Import your **seo-tools** repo
4. Before deploying, click **Environment Variables**
5. Add these variables (copy from your `.env`):

   | Name | Value |
   |------|-------|
   | DATABASE_URL | Your Neon connection string |
   | NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Your Clerk publishable key |
   | CLERK_SECRET_KEY | Your Clerk secret key |
   | DATA_FOR_SEO_LOGIN | (Optional) Or add in Settings later |
   | DATA_FOR_SEO_PASSWORD | (Optional) Or add in Settings later |

6. Click **Deploy**
7. Wait for the build to finish
8. Copy your live URL (e.g. `https://seo-tools-xxx.vercel.app`)

---

## Step 3: Configure Clerk for Production

1. Go to **https://dashboard.clerk.com**
2. Select your **seo-tools** application
3. Go to **Configure** → **Paths** (or **Domains**)
4. Add your Vercel domain, e.g. `seo-tools-xxx.vercel.app`
5. Set:
   - Sign-in URL: `https://your-app.vercel.app/sign-in`
   - Sign-up URL: `https://your-app.vercel.app/sign-up`
   - After sign-in: `https://your-app.vercel.app/`
   - After sign-up: `https://your-app.vercel.app/`

---

## Step 4: Update Client Handover

1. Open `CLIENT_HANDOVER.md`
2. Replace `https://[your-app].vercel.app` with your real Vercel URL
3. Save and commit:
   ```bash
   git add CLIENT_HANDOVER.md
   git commit -m "Update handover URL"
   git push
   ```

---

## Step 5: Hand Over to Client

1. Send the client:
   - Live URL
   - `CLIENT_HANDOVER.md` (or a short summary)
2. Client signs up as first user
3. (Optional) Client adds DataForSEO in Settings for full features

---

## Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created and env vars added
- [ ] Build succeeded
- [ ] Clerk paths/domains updated with Vercel URL
- [ ] Client handover doc updated with live URL
- [ ] Client can sign up and access dashboard
