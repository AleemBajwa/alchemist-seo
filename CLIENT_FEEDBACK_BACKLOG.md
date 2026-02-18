# Client Feedback Backlog

Based on `SEO_Tool_Feature_Specification.pdf`, this backlog maps required scope into delivery phases.

## P0 (Immediate - in progress)

- Keyword module upgrades:
  - country + language selector
  - richer keyword metrics payload (competition + monthly trend points)
  - 12-month trend chart
  - grouped suggestions (long-tail, question, semantic)
  - CSV + Excel export
- Stabilize UI readability and consistency in dark/holographic theme.

## P1 (Next sprint)

- Keyword research depth:
  - autocomplete suggestions
  - related keyword clusters and tagging
  - SERP top-10 panel for selected keyword
  - estimated traffic at ranking URL level
- Project organization:
  - keyword list folders
  - keyword tagging and filtering

## P2 (Major module)

- AI Content Generator:
  - title/meta/H1-H3 generation
  - long-form article + FAQ generation
  - tone + language controls
  - SEO scoring + readability + keyword density
  - schema/meta tags output
  - competitor-content gap analysis

## P3 (Auditor expansion)

- Advanced crawler + technical checks:
  - sitemap crawl, redirect chains, orphan pages
  - duplicate title/description/content checks
  - Core Web Vitals + mobile checks
  - image SEO checks (alt + size)
  - anchor text and internal linking analysis

## Notes

- DataForSEO credentials remain owner-managed server-side.
- Billing remains Stripe subscription controlled.
- Each phase should ship with targeted smoke tests and export/report validation.
