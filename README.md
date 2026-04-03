# Sub-Site — Subscription Tracker

A free subscription spending tracker that runs entirely in your browser. No account, no bank login — your data is stored locally and never sent to a server.

**Use it free: [sub-site.com](https://sub-site.com)**

---

## Features

- **Dashboard** — Overview with monthly/annual spend, trend sparkline, upcoming renewals, category breakdown, possible savings widget, and potential annual savings nudge (shows estimated saving from switching monthly plans to annual billing)
- **Subscriptions** — Add, edit, delete, search, filter, and sort your subscriptions; four statuses: Active, Paused, Cancelled, and Wishlist
- **Shared Cost Splitter** — Mark a subscription as a shared plan and split the cost between N people; individual share shown in all calculations
- **Quarterly Audit Mode** — Prompted every 90 days; steps through each active subscription with Keep / Pause / Cancel / Wishlist actions; shows projected annual saving from changes
- **Alternatives** — Discover cheaper alternatives via tier-1 per-service matches and tier-2 category fallbacks (see [ALTERNATIVES-LOGIC.md](ALTERNATIVES-LOGIC.md))
- **Import from Email** — Client-side parser for renewal emails via paste, .eml file drop, or direct OS share (Android/iOS). Extracts service, cost, cycle, and next date; pre-fills the Add Subscription form. Zero network requests — email text never leaves the device.
- **Backup & Restore** — Download as JSON backup or CSV; restore with merge (smart content-fingerprint deduplication) or replace
- **Settings** — Default currency (GBP/USD/EUR/CAD/AUD), waste alert threshold, data management
- **Light/Dark mode** — Persistent theme toggle, WCAG 2.2 AA compliant in both modes
- **Feedback form** — Sends submissions via Cloudflare Worker + Email Routing (no third-party services)
- **User Guide** — Comprehensive in-app guide at `/guide.html` covering all features
- **Blog** — Articles on subscription management, privacy, and saving money at `/blog/`
- **Privacy policy** — Plain-English UK GDPR/PECR compliant policy at `/privacy.html`
- **PWA** — Installable as a Progressive Web App; works offline
- **100% Private** — Subscription data never leaves your browser

---

## Tech Stack

- **Pure HTML5 / CSS3 / Vanilla ES6+** — no build step, no npm, no frameworks
- **localStorage** — all subscription data stored client-side
- **Light/dark theme** — CSS custom properties, toggled via `html[data-theme="light"]`
- **Responsive** — desktop sidebar + mobile sticky header + bottom navigation
- **Cloudflare Pages** — static site hosting
- **Cloudflare Worker** — feedback form email relay (`worker/`)
- **Cloudflare Email Routing** — forwards form submissions to inbox
- **Analytics** — self-hosted [Umami](https://umami.is/) (privacy-respecting, no cookies, no personal data)

---

## File Structure

```
.
├── public/                     # Static site — deployed via Cloudflare Pages
│   ├── index.html              # Main app (dashboard, subscriptions, export, settings)
│   ├── guide.html              # User guide
│   ├── privacy.html            # Privacy policy
│   ├── feedback.html           # Feedback form
│   ├── _headers                # Cloudflare Pages cache-control rules
│   ├── css/
│   │   ├── style.css           # All styles (light/dark, responsive)
│   │   └── guide-base.css      # Slim stylesheet for guide/blog pages
│   ├── js/
│   │   ├── app.js              # Routing, navigation, theme management, URL param reader
│   │   ├── storage.js          # localStorage CRUD + JSON/CSV export
│   │   ├── charts.js           # Category bar chart & trend sparkline
│   │   ├── ui.js               # All view renders and templates
│   │   └── email-parser.js     # MIME decoder + two-pass regex extraction engine
│   ├── guide/                  # SEO guide pages (cancel guides)
│   ├── blog/                   # Blog index and posts
│   ├── manifest.json           # PWA manifest — share_target for Android email sharing
│   ├── sw.js                   # Service worker — offline cache
│   └── data/
│       ├── affiliates.js       # 200 known services + category fallbacks (homepage, price, lastVerified)
│       └── monitored-urls.json # Services monitored for price changes
├── worker/                     # Cloudflare Worker — feedback form email relay
│   ├── wrangler.toml           # Worker config (send_email binding)
│   └── src/
│       └── index.js            # Worker handler
├── scripts/
│   └── check-prices.mjs        # Node 20 ESM price-change monitor script
├── tests/
│   ├── runner.html             # Browser-based test harness
│   ├── lib/assert.js           # Test utilities
│   └── test-*.js               # Unit tests
├── ALTERNATIVES-LOGIC.md       # How the recommendation engine works
├── SITE_MAP.md                 # Site structure reference
├── SEO-KEYWORDS.md             # Target keyword list
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

The site is designed for **Cloudflare Pages**. Deploy with:

```bash
# Production
wrangler pages deploy public --project-name <your-project-name>

# Preview branch
wrangler pages deploy public --project-name <your-project-name> --branch beta
```

### Feedback Worker

The feedback form requires a separate Cloudflare Worker:

```bash
# Set the destination email secret:
wrangler secret put DEST_EMAIL --config worker/wrangler.toml

# Deploy:
wrangler deploy --config worker/wrangler.toml
```

The Worker uses the `send_email` binding with Cloudflare Email Routing. `DEST_EMAIL` must be a verified destination address in your Email Routing configuration.

After deploying, update the `WORKER_URL` constant in `public/feedback.html` to match your Worker's URL.

### Turnstile (bot protection on feedback form)

Add your Cloudflare Turnstile site key to the `data-sitekey` attribute in `public/feedback.html`, then set the secret:

```bash
wrangler secret put TURNSTILE_SECRET --config worker/wrangler.toml
```

---

## Before Going Live

- Replace all `AFFILIATE_URL` placeholders in `public/data/affiliates.js` with real affiliate links
- Update `WORKER_URL` in `public/feedback.html` if the Worker URL changes
- Update the contact email in `public/privacy.html`
- Update analytics script in all HTML pages if self-hosting Umami (or remove if not using analytics)

---

## Email Import

A client-side email parser that extracts subscription details (service name, cost, billing cycle, next date) from renewal emails without any network requests. All parsing happens in the browser.

**Three input methods:**
- **Paste** — copy the email body text, the modal auto-reads the clipboard on open (if permission granted)
- **.eml file** — drag-and-drop or file picker; parses MIME structure including base64 and quoted-printable encoded parts
- **OS share** — Android and iOS can share emails directly to the app (see below)

**How the parser works:** Two-pass regex. First pass targets labeled patterns (e.g. `Next billing date:`, `Renews on:`). Second pass does a generic date/price scan, picking the soonest future date. A confidence score (0–100%) reflects how many fields were found.

**Android (PWA share target):** Install Sub-Site as a PWA (Add to Home Screen in Chrome), then use the share button in your email app and select Sub-Site. Requires the app to be installed from a served URL (not `file://`).

**iOS (Shortcuts):**
1. Open the Shortcuts app → New Shortcut
2. Add action: **Get Text from Input** (share sheet)
3. Add action: **Open URL** — set to `https://<your-domain>/?text=[Shortcut Input]`
4. Enable "Show in Share Sheet"
5. In Mail or Gmail, tap Share → your shortcut — the app opens with the email pre-parsed

**Privacy:** Email text is processed entirely in the browser. It is never sent to any server.

---

## Privacy & Security

- **No server backend** for subscription data — all computation in the browser
- **Privacy-respecting analytics** — self-hosted [Umami](https://umami.is/): no cookies, no personal data, no cross-site tracking. Data stays on your own server.
- **No font CDN** — system font stack only
- **Feedback form only** — the Cloudflare Worker processes form submissions in transit; no database storage
- See [public/privacy.html](public/privacy.html) for the full UK GDPR/PECR policy

---

## Browser Compatibility

Requires a modern browser with ES6+, localStorage, CSS custom properties, CSS Grid and Flexbox.

Chrome/Edge 80+, Firefox 75+, Safari 13.1+

---

## License

See [LICENSE](LICENSE) for details.
