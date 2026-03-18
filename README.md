# Sub-Site — Subscription Tracker

A privacy-first subscription spending tracker built as a static website. All subscription data is stored in your browser's localStorage — no server, no accounts, no build step.

Live: **[sub-site.com](https://sub-site.com)** · Beta: **[beta.sub-site.com](https://beta.sub-site.com)**

---

## Features

- **Dashboard** — Overview with monthly/annual spend, trend sparkline, upcoming renewals, category breakdown, and possible savings widget
- **Subscriptions** — Add, edit, delete, search, filter, and sort your subscriptions
- **Alternatives** — Discover cheaper alternatives via tier-1 per-service matches and tier-2 category fallbacks (see [ALTERNATIVES-LOGIC.md](ALTERNATIVES-LOGIC.md))
- **Export & Import** — Download as JSON backup or CSV; restore with merge or replace
- **Settings** — Default currency (GBP/USD/EUR/CAD/AUD), waste alert threshold, data management
- **Light/Dark mode** — Persistent theme toggle, WCAG 2.2 AA compliant in both modes
- **Feedback form** — Sends submissions via Cloudflare Worker + Email Routing (no third-party services)
- **Privacy policy** — Plain-English UK GDPR/PECR compliant policy at `/privacy.html`
- **100% Private** — Subscription data never leaves your browser

---

## Tech Stack

- **Pure HTML5 / CSS3 / Vanilla ES6+** — no build step, no npm, no frameworks
- **localStorage** — all subscription data stored client-side
- **Light/dark theme** — CSS custom properties, toggled via `html[data-theme="light"]`
- **Responsive** — desktop sidebar + mobile sticky header + bottom navigation
- **Cloudflare Pages** — static site hosting (beta and production branches)
- **Cloudflare Worker** — feedback form email relay (`worker/`)
- **Cloudflare Email Routing** — forwards form submissions to inbox

---

## File Structure

```
.
├── public/                     # Static site — deployed via Cloudflare Pages
│   ├── index.html              # Main app (dashboard, subscriptions, export, settings)
│   ├── privacy.html            # Privacy policy
│   ├── feedback.html           # Feedback form
│   ├── _headers                # Cloudflare Pages cache-control rules
│   ├── css/
│   │   └── style.css           # All styles (light/dark, responsive)
│   ├── js/
│   │   ├── app.js              # Routing, navigation, theme management
│   │   ├── storage.js          # localStorage CRUD + JSON/CSV export
│   │   ├── charts.js           # Category bar chart & trend sparkline
│   │   └── ui.js               # All view renders and templates
│   └── data/
│       └── affiliates.js       # 173 known services + category fallbacks
├── worker/                     # Cloudflare Worker — feedback form email relay
│   ├── wrangler.toml           # Worker config (send_email binding)
│   └── src/
│       └── index.js            # Worker handler
├── tests/
│   ├── runner.html             # Browser-based test harness
│   ├── lib/assert.js           # Test utilities
│   └── test-*.js               # Unit tests
├── docs/                       # Additional documentation
├── ALTERNATIVES-LOGIC.md       # How the recommendation engine works
├── wrangler.toml               # Cloudflare Pages config
└── LICENSE
```

---

## Getting Started

### Run Locally

```bash
# Option 1: open directly
open public/index.html

# Option 2: local server (avoids file:// quirks)
cd public && python3 -m http.server 8000
# visit http://localhost:8000
```

### Run Tests

Open `tests/runner.html` in a browser.

---

## Deployment

The site uses **Cloudflare Pages** with two branches:

| Branch | URL | Command |
|---|---|---|
| `main` | sub-site.com | `wrangler pages deploy public --project-name sub-site` |
| `beta` | beta.sub-site.com | `wrangler pages deploy public --project-name sub-site --branch beta` |

### Feedback Worker

The feedback form requires a separate Cloudflare Worker deployment:

```bash
# First time — set the destination email secret:
wrangler secret put DEST_EMAIL --config worker/wrangler.toml

# Deploy / redeploy:
wrangler deploy --config worker/wrangler.toml
```

The Worker uses the `send_email` binding with Cloudflare Email Routing. `DEST_EMAIL` must be a verified destination address in your Email Routing configuration.

After deploying the Worker, update the `WORKER_URL` constant in `public/feedback.html` to match the deployed Workers URL.

---

## Before Going Live

- Replace all `AFFILIATE_URL` placeholders in `data/affiliates.js` with real affiliate links
- Update `public/feedback.html` `WORKER_URL` if the Worker URL changes
- Review and update `public/privacy.html` contact email if needed

---

## Privacy & Security

- **No server backend** for subscription data — all computation in the browser
- **No analytics** — no tracking scripts, no page-view telemetry
- **No font CDN** — system font stack only
- **Feedback form only** — the Cloudflare Worker processes form submissions in transit; no database storage
- See [public/privacy.html](public/privacy.html) for the full UK GDPR/PECR policy

---

## Browser Compatibility

Requires a modern browser with ES6+, localStorage, CSS custom properties, CSS Grid and Flexbox.

Chrome/Edge 80+, Firefox 75+, Safari 13.1+

---

## License

See LICENSE file for details.
