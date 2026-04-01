# Sub-Site — Site Map

Live at **https://sub-site.com** · Beta preview at **https://beta.sub-site.pages.dev**
Update this file whenever a page is added, removed, or restructured.

---

## App

| URL | File | Description |
|---|---|---|
| `https://sub-site.com/` | `public/index.html` | Main SPA — dashboard, subscriptions, alternatives, backup, settings |
| `https://sub-site.com/calculator.html` | `public/calculator.html` | Standalone subscription cost calculator |
| `https://sub-site.com/feedback.html` | `public/feedback.html` | Feedback form (Cloudflare Turnstile + Worker email relay) |
| `https://sub-site.com/privacy.html` | `public/privacy.html` | Privacy policy |

## User Guide

| URL | File | Description |
|---|---|---|
| `https://sub-site.com/guide.html` | `public/guide.html` | Main user guide for the app |

## Blog

| URL | File | Description |
|---|---|---|
| `https://sub-site.com/blog/` | `public/blog/index.html` | Blog index |
| `https://sub-site.com/blog/subscription-tracker-financial-data-privacy` | `public/blog/subscription-tracker-financial-data-privacy.html` | Why your subscription tracker is selling your financial data (Apr 2026) |

## SEO Guide Pages

| URL | File | Description |
|---|---|---|
| `https://sub-site.com/guide/manage-subscriptions.html` | `public/guide/manage-subscriptions.html` | How to track subscriptions without sharing your data |
| `https://sub-site.com/guide/cancel-netflix.html` | `public/guide/cancel-netflix.html` | How to cancel Netflix UK |
| `https://sub-site.com/guide/cancel-amazon-prime.html` | `public/guide/cancel-amazon-prime.html` | How to cancel Amazon Prime UK |
| `https://sub-site.com/guide/cancel-adobe-cc.html` | `public/guide/cancel-adobe-cc.html` | How to cancel Adobe Creative Cloud UK |
| `https://sub-site.com/guide/cancel-spotify.html` | `public/guide/cancel-spotify.html` | How to cancel Spotify Premium UK |
| `https://sub-site.com/guide/cancel-disney-plus.html` | `public/guide/cancel-disney-plus.html` | How to cancel Disney+ UK |
| `https://sub-site.com/guide/cancel-microsoft-365.html` | `public/guide/cancel-microsoft-365.html` | How to cancel Microsoft 365 UK |
| `https://sub-site.com/guide/cancel-youtube-premium.html` | `public/guide/cancel-youtube-premium.html` | How to cancel YouTube Premium UK |
| `https://sub-site.com/guide/cancel-apple-tv-plus.html` | `public/guide/cancel-apple-tv-plus.html` | How to cancel Apple TV+ UK |
| `https://sub-site.com/guide/cancel-apple-music.html` | `public/guide/cancel-apple-music.html` | How to cancel Apple Music UK |
| `https://sub-site.com/guide/cancel-xbox-game-pass.html` | `public/guide/cancel-xbox-game-pass.html` | How to cancel Xbox Game Pass UK |
| `https://sub-site.com/guide/cancel-playstation-plus.html` | `public/guide/cancel-playstation-plus.html` | How to cancel PlayStation Plus UK |
| `https://sub-site.com/guide/cancel-audible.html` | `public/guide/cancel-audible.html` | How to cancel Audible UK |
| `https://sub-site.com/guide/cancel-now-tv.html` | `public/guide/cancel-now-tv.html` | How to cancel NOW TV UK |

---

## CSS

| File | Used by |
|---|---|
| `public/css/style.css` | `index.html`, `guide.html`, `calculator.html`, `privacy.html`, `feedback.html` |
| `public/css/guide-base.css` | All pages under `public/guide/` and `public/blog/` |

## Infrastructure

| Component | Details |
|---|---|
| Hosting | Cloudflare Pages — `beta` branch → beta.sub-site.pages.dev, `main` branch → sub-site.com |
| Worker | `worker/src/index.js` — feedback email relay via Cloudflare Email Routing |
| PWA | Service worker at `public/sw.js`, manifest at `public/manifest.json`, icons in `public/icons/` |
| Analytics | Self-hosted Umami at `analytics.sub-site.com` (privacy-respecting, no cookies) |
| Sitemap | `public/sitemap.xml` — submitted to Google Search Console |

## Notes

- SEO guide pages are not linked from the main app nav — discovered via Google and sitemap.
- Blog pages use `guide-base.css` (slim ~3.5 KB) not the full `style.css`.
- All internal links use `/` or root-relative paths (not `index.html`) — Cloudflare Pages redirects `/index.html` → `/`.
- The calculator links to the main app via shared `localStorage`.
