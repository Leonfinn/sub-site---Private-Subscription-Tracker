# Sub-Site — Site Map

Live at **https://sub-site.com** (beta branch = production).
Update this file whenever a page is added or removed.

---

## App

| URL | File | Description |
|---|---|---|
| `https://sub-site.com/` | `public/index.html` | Main SPA — dashboard, subscriptions, alternatives, export, settings |
| `https://sub-site.com/calculator.html` | `public/calculator.html` | Standalone subscription cost calculator |
| `https://sub-site.com/feedback.html` | `public/feedback.html` | Feedback form |
| `https://sub-site.com/privacy.html` | `public/privacy.html` | Privacy policy |

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

---

## Notes

- Guide pages are SEO-only — not linked from the app navigation, discovered via Google.
- The calculator is linked from the app sidebar and connects to the main app via shared `localStorage`.
- All pages share `public/css/style.css` (currently `?v=1.1`).
