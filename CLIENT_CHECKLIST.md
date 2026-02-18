# AlChemist SEO – Client Checklist

**One-page summary of the entire platform, aligned with:**  
- **Client requirement:** `SEO_Tool_Feature_Specification.pdf` (Ahrefs & SEMrush Lite – Modules 1–3)  
- **Third-party review / backlog:** `CLIENT_FEEDBACK_BACKLOG.md` (P0–P3)

Use this document to onboard clients and to track **implemented** vs **left**.

---

## Access & login

- [x] **Live URL** – Deploy (e.g. Vercel); use for sign up / sign in
- [x] **Sign up / Sign in** – Email + password via Clerk
- [x] **Setup status** – Visit `/setup` to see required env (DB, Clerk, DataForSEO)

---

## Module 1: Keyword Research Tool (PDF spec)

- [x] Keyword search bar with country and language selection
- [x] Keyword overview dashboard (search volume, keyword difficulty, CPC, competition)
- [x] 12-month keyword trend graph
- [x] Related keywords suggestions
- [x] Long-tail keyword suggestions
- [x] Question-based keywords (People Also Ask)
- [x] Autocomplete keyword suggestions
- [x] Semantic / LSI keyword generation
- [x] SERP analysis showing top 10 ranking pages
- [x] Display domain authority and backlinks of top results
- [x] Estimated traffic for ranking pages
- [x] Keyword list saving and project folders
- [ ] **Keyword tagging and organization** – *Folders/organization implemented; custom tags per keyword not implemented*
- [x] Export keywords in CSV and Excel format

---

## Module 2: AI Content Generator (PDF spec)

- [x] AI blog/article generator (SEO optimized)
- [x] SEO title generation
- [x] Meta description generator
- [x] H1, H2, H3 heading structure generation
- [x] Full long-form article generation (1000–5000 words; app supports 300–5000)
- [x] FAQ section generation
- [x] Content tone selection (professional, casual, sales)
- [x] Multi-language content generation
- [x] AI content optimization score (SEO score 0–100)
- [x] Keyword density checker
- [x] NLP keyword suggestions
- [x] Readability score analysis
- [x] AI meta tags generator (Title, Description, Open Graph)
- [x] Schema markup (JSON-LD) generator
- [x] Competitor URL content analysis
- [x] Content gap analysis vs competitor pages

---

## Module 3: Website SEO Auditor (PDF spec)

- [x] Full website crawler
- [x] Sitemap detection and crawling
- [x] Broken links detection
- [x] Redirect chain detection
- [x] Missing meta title detection
- [x] Duplicate meta title detection
- [x] Missing meta description detection
- [x] Title length optimization check
- [x] Heading structure analysis (H1, H2, H3)
- [x] Multiple H1 detection
- [x] Thin content detection
- [x] Keyword presence check on pages (focus keyword)
- [x] Duplicate content detection
- [x] Technical SEO audit (HTTPS, canonical, indexability)
- [x] Core Web Vitals and page speed analysis
- [x] Mobile friendliness check
- [x] Image SEO analysis (ALT tags, image size)
- [x] Internal linking analysis
- [x] Orphan pages detection
- [x] Anchor text analysis
- [x] SEO audit score (0–100)
- [x] Downloadable SEO audit report (PDF)

---

## Platform extras (beyond PDF spec)

### Dashboard & navigation
- [x] **Dashboard** (`/`) – Project count, audit count, API status; Tools grid (all 8 tools); charts
- [x] **Projects** (`/projects`) – Create/manage sites; project detail with keyword folders and audit links
- [x] **Project detail** (`/projects/[id]`) – View project; link to keyword folders and audits

### Domain & positions
- [x] **Domain Overview** (`/domain`) – Rank, ETV, keyword count; Organic tab; Backlinks tab (separate DataForSEO plan); **History** tab with monthly snapshots (auto-saved)
- [x] **Keyword Gap** (`/domain/gap`) – Compare two domains (overlapping/unique keywords)
- [x] **Position Tracking** (`/positions`) – Check Google rankings for keyword list + URL (DataForSEO)

### Audit & content
- [x] **Site Audit** – Single URL or full-site; max pages (1–100); technical summary (crawl source, orphans, redirects, duplicate title/meta); sitemap check; PageSpeed; PDF export with technical summary
- [x] **Audit History** (`/audit/history`) – List past audits
- [x] **AI Content Briefs** – Pillar topic + cluster count → pillar + cluster outlines with H2s (Content tab)

### Settings & API
- [x] **Settings** – DataForSEO status; Subscription (Stripe); White-label; **API Keys** (create/list/revoke) for programmatic access
- [x] **API access** – Auth via API key (`X-API-Key` or Bearer); domain, keyword, audit and other routes support key-based auth

---

## Data & integrations

- [x] **DataForSEO** – Keyword Research, Position Tracking, Domain Overview, Keyword Gap, Backlinks (Backlinks may need separate plan)
- [x] **OpenAI** (optional) – AI Content (generate + briefs)
- [x] **PostgreSQL** – Users, projects, audit runs, domain snapshots, API keys
- [x] **Clerk** – Auth; user sync to DB

---

## Exports & reports

- [x] **Keywords** – CSV and Excel (Keywords, Clusters, Monthly Trend, Grouped Suggestions)
- [x] **Audit** – PDF (single or full-site; technical summary for full-site)
- [x] **Domain** – History tab (monthly snapshots in UI; no file export)

---

## Technical summary (for client)

| Item | Details |
|------|--------|
| **Stack** | Next.js, PostgreSQL (Neon), Clerk, DataForSEO, optional OpenAI |
| **Hosting** | Vercel (recommended) |
| **Auth** | Clerk; API keys for programmatic access |
| **Billing** | Stripe (optional); DataForSEO pay-as-you-go via owner account |

---

## What’s left (from spec + backlog)

| Item | Source | Status |
|------|--------|--------|
| **Keyword tagging** | PDF Module 1 – “Keyword tagging and organization” | Not implemented. Organization via folders is done; custom tags/labels per keyword are not. |
| *(All other PDF spec items and P0–P3 backlog items are implemented.)* | | |

---

## Quick verification checklist

1. [x] Login works (Clerk)
2. [x] Projects: create, list, open
3. [x] Domain Overview: run analysis, Organic + History (Backlinks if plan allows)
4. [x] Keyword Gap: compare two domains
5. [x] Keyword Research: search, suggestions, trend, SERP top 10, save to folder, export CSV/Excel
6. [x] Position Tracking: run for keywords + URL
7. [x] Site Audit: single + full-site (max pages), technical summary, PDF export
8. [x] Audit History: view past audits
9. [x] AI Content: generate article + content brief (if OpenAI configured)
10. [x] Settings: DataForSEO status; API keys; optional white-label and billing

---

*Last updated: February 2025. Aligned with `SEO_Tool_Feature_Specification.pdf` and `CLIENT_FEEDBACK_BACKLOG.md`.*
