# Sub-Site — Subscription Tracker

A privacy-first subscription spending tracker built as a static website. All subscription data is stored in your browser's localStorage — no server, no accounts, no build step.

Live: **[sub-site.com](https://sub-site.com)** · Beta: **[beta.sub-site.com](https://beta.sub-site.com)**

---

## Features

- **Dashboard** — Overview with monthly/annual spend, trend sparkline, upcoming renewals, category breakdown, and possible savings widget
- **Subscriptions** — Add, edit, delete, search, filter, and sort your subscriptions
- **Alternatives** — Discover cheaper alternatives via tier-1 per-service matches and tier-2 category fallbacks (see [ALTERNATIVES-LOGIC.md](ALTERNATIVES-LOGIC.md))
- **Import from Email** — Client-side parser for renewal emails via paste, .eml file drop, or direct OS share (Android/iOS). Extracts service, cost, cycle, and next date; pre-fills the Add Subscription form. Zero network requests — email text never leaves the device.
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
│   │   ├── app.js              # Routing, navigation, theme management, URL param reader
│   │   ├── storage.js          # localStorage CRUD + JSON/CSV export
│   │   ├── charts.js           # Category bar chart & trend sparkline
│   │   ├── ui.js               # All view renders and templates
│   │   └── email-parser.js     # MIME decoder + two-pass regex extraction engine
│   ├── manifest.json           # PWA manifest — share_target for Android email sharing
│   └── data/
│       ├── affiliates.js       # 200 known services + category fallbacks (homepage, price, lastVerified)
│       └── monitored-urls.json # ~20 high-volatility services monitored for price changes
├── worker/                     # Cloudflare Worker — feedback form email relay
│   ├── wrangler.toml           # Worker config (send_email binding)
│   └── src/
│       └── index.js            # Worker handler
├── scripts/
│   └── check-prices.mjs        # Node 20 ESM price-change monitor script
├── .gitea/
│   └── workflows/
│       └── price-monitor.yml   # Weekly Gitea Actions cron — detects pricing page changes
├── data/
│   └── price-hashes.json       # Stored content hashes (updated by price-monitor workflow)
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

## Price Monitoring (Gitea Actions)

A weekly workflow detects content changes on tracked pricing pages and opens a PR for manual review. This is **not scraping** — it just detects whether the page has changed.

### Prerequisites

- A self-hosted Gitea Actions runner registered to this repository (see below)
- Node.js 20+ available on the runner (installed automatically by `actions/setup-node@v4`)
- A Gitea personal access token stored as repository secret `GITEA_TOKEN`

### How it works

1. `.gitea/workflows/price-monitor.yml` runs on a weekly cron (Monday 08:00 UTC)
2. `scripts/check-prices.mjs` fetches each URL in `public/data/monitored-urls.json`
3. Page content (title + first price pattern) is hashed and compared against `data/price-hashes.json`
4. If any hash changed: the script exits with code 1; the workflow commits updated hashes to a new branch and opens a PR via the Gitea API
5. Review the PR, manually verify the changed service's pricing page, update `price` + `lastVerified` in `public/data/affiliates.js`, and merge

Manual trigger: use the `workflow_dispatch` event in the Gitea Actions UI.

### Runner setup on TrueNAS Scale / Docker

Gitea runs as a Docker container in TrueNAS Scale. The runner must also run as a container.

**Step 1 — Get a registration token**

Gitea: **Repository → Settings → Actions → Runners → Create new runner**

**Step 2 — Create a persistent volume and config**

```bash
# Create volume directory on your ZFS pool
mkdir -p /mnt/pool/gitea-runner
```

Create `/mnt/pool/gitea-runner/config.yaml`:

```yaml
log:
  level: info
runner:
  file: .runner
  capacity: 1
  timeout: 3h
  insecure: false
cache:
  enabled: false
```

**Step 3 — Register the runner (one-off)**

```bash
docker run --rm \
  -v /mnt/pool/gitea-runner:/data \
  gitea/act_runner:latest \
  register \
  --no-interactive \
  --instance http://192.168.68.67:3003 \
  --token <TOKEN_FROM_STEP_1> \
  --name "truenas-runner" \
  --labels "self-hosted,linux,x64"
```

**Step 4 — Deploy the runner (Docker Compose)**

Create `/mnt/pool/gitea-runner/docker-compose.yml`:

```yaml
services:
  act_runner:
    image: gitea/act_runner:latest
    restart: unless-stopped
    volumes:
      - /mnt/pool/gitea-runner:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      GITEA_INSTANCE_URL: http://192.168.68.67:3003
      GITEA_RUNNER_REGISTRATION_TOKEN: ""
    network_mode: host
```

```bash
docker compose -f /mnt/pool/gitea-runner/docker-compose.yml up -d
```

Alternatively, use the **TrueNAS Scale Custom App GUI**: Apps → Custom App → Add, with image `gitea/act_runner:latest`, the volume mount and environment variable above, and host networking.

**Notes:**
- Do **not** install the runner natively on TrueNAS Scale's OS — use Docker only
- The runner volume should be on a ZFS dataset so it survives TrueNAS updates
- If Gitea uses a custom Docker network, add the runner to the same network instead of host networking

**Step 5 — Add the Gitea token as a repo secret**

Gitea: **Repository → Settings → Secrets → Add Secret**
- Name: `GITEA_TOKEN`
- Value: personal access token with `repo` scope (Settings → Applications → Generate Token)

**Step 6 — Verify**

Gitea: **Repository → Settings → Actions → Runners** — runner should appear as `truenas-runner` (green/online).

---

## Before Going Live

- Replace all `AFFILIATE_URL` placeholders in `data/affiliates.js` with real affiliate links
- Update `public/feedback.html` `WORKER_URL` if the Worker URL changes
- Review and update `public/privacy.html` contact email if needed

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
3. Add action: **Open URL** — set to `https://beta.sub-site.com/?text=[Shortcut Input]`
4. Enable "Show in Share Sheet"
5. In Mail or Gmail, tap Share → your shortcut — the app opens with the email pre-parsed

**Privacy:** Email text is processed entirely in the browser. It is never sent to any server.

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
