# SubSight — Design Specification
**Date:** 2026-03-15
**Status:** Approved

---

## Overview

SubSight is a privacy-first subscription spending tracker delivered as a hosted static website. All user data is stored exclusively in the browser's `localStorage` — nothing is sent to any server. The product tagline is *"See exactly what your subscriptions are costing you — privately."*

Monetisation is via affiliate links for cheaper alternatives, surfaced transparently within the app.

---

## Visual Design

**Style:** Dark & Analytical
Deep navy/slate backgrounds (`#0a0f1e`, `#0f172a`, `#1e293b`), electric blue accents (`#38bdf8`, `#0ea5e9`), system font stack. Data-forward financial dashboard aesthetic. Urgency indicators use amber (`#f59e0b`); status colours use green/amber/red.

**Typography:** System UI stack — no external fonts loaded.

**Responsive:** Sidebar navigation on desktop collapses to a bottom tab bar on mobile. Mobile is fully supported; flag to user if any feature becomes a mobile blocker during implementation.

---

## Architecture

### File Structure

```
subsight/
├── index.html          # Shell: nav, modal scaffolding, script/link tags
├── css/
│   └── style.css       # All styles — dark theme, components, responsive
├── js/
│   ├── app.js          # Main controller: init, routing, event bus
│   ├── storage.js      # localStorage read/write, import/export
│   ├── ui.js           # DOM rendering — dashboard, subscription list, modals
│   └── charts.js       # Pure SVG/CSS bar chart + sparkline
└── data/
    └── affiliates.js   # Affiliate database (known services + category fallbacks)
```

Multi-file static site. No build step. Hostable on GitHub Pages, Netlify, or any static host by deploying the directory.

### Data Flow

`app.js` owns in-memory state (array of subscription objects). Any mutation goes through `storage.js`, which persists to `localStorage` and fires a custom DOM event (`subsight:updated`, payload: full subscriptions array). `ui.js` listens and re-renders the affected view. No framework, no virtual DOM — imperative DOM updates only.

**Module responsibilities:**
- `app.js`: initialisation, view routing (show/hide sections), event wiring between modules
- `storage.js`: all localStorage reads/writes, JSON/CSV serialisation, import/export logic
- `ui.js`: all DOM rendering for every view including the Export page's UI; calls `storage.js` functions directly for export/import actions
- `charts.js`: SVG/CSS rendering for the category bar chart and sparkline; pure functions that take data arrays and return DOM elements

### localStorage Schema

```json
{
  "subsight_schema_version": 1,
  "subsight_subscriptions": [],
  "subsight_trust_banner_dismissed": true,
  "subsight_settings": { "defaultCurrency": "GBP", "wasteAlertThreshold": 1500 }
}
```

### Subscription Object

```json
{
  "id": "uuid-v4",
  "name": "Netflix",
  "category": "Streaming",
  "cost": 17.99,
  "currency": "GBP",
  "billingCycle": "Monthly",
  "nextBillingDate": "2026-04-01",
  "status": "Active",
  "starred": false,
  "notes": ""
}
```

**Fields:**
- `billingCycle`: `"Monthly"` | `"Quarterly"` | `"Annually"` | `"Weekly"`
- `status`: `"Active"` | `"Paused"` | `"Cancelled"`
- `currency`: `"GBP"` | `"USD"` | `"EUR"` | `"CAD"` | `"AUD"`
- `category`: one of the following 10 fixed values:
  `"Streaming"` | `"Software / SaaS"` | `"Cloud Storage"` | `"Gaming"` | `"Music"` | `"News / Media"` | `"Health & Fitness"` | `"Finance"` | `"Productivity"` | `"Other"`

---

## Navigation

Five nav items, rendered as a fixed left sidebar on desktop and a bottom tab bar on mobile:

| Icon | Label | View |
|---|---|---|
| ◈ | Dashboard | Spending overview |
| ≡ | Subscriptions | Full list, add/edit |
| ↗ | Alternatives | Affiliate suggestions |
| ⤓ | Export | Backup & restore |
| ◎ | Settings | Currency default, data reset |

Client-side routing: show/hide view `<section>` elements by toggling a CSS class. No URL hash routing required for v1.

---

## Views

### Dashboard

Top-level spending overview. Contains:

1. **Trust banner** (dismissible, shown on first visit): *"Your data never leaves this device. SubSight runs entirely in your browser — no accounts, no servers, no tracking."* Dismissal stored in `localStorage`.

2. **Waste alert** (shown when projected annual spend exceeds the configured threshold, default £1,500/year — user-adjustable in Settings): Amber banner — *"Heads up: You're spending £X/year on subscriptions. The average person wastes £624/year on services they barely use — have you reviewed yours lately?"* The currency symbol in the banner matches the user's default currency setting. The waste alert is suppressed entirely when subscriptions span multiple currencies (spend cannot be meaningfully summed).

3. **Stat cards row (3 cards):**
   - Monthly spend (accent blue, large)
   - Annual spend (projected: monthly equivalent × 12)
   - Renewals due in next 30 days (count)

4. **Category bar chart:** Horizontal bars, one per category that has spend. Pure CSS/SVG — no chart library. Proportional widths, colour-coded by category.

5. **Monthly trend sparkline:** Vertical bars for last 6 months of monthly spend totals. Derived by working backwards from each active subscription's `nextBillingDate` and `billingCycle` — no additional stored data required. Only active subscriptions with a `nextBillingDate` set contribute. Billing cycle contribution rules:
   - **Monthly**: contributes its cost to every month it would have billed in.
   - **Weekly**: contributes `cost × 52 / 12` to every calendar month in range.
   - **Quarterly**: contributes its full cost only to the specific month it bills (not amortised).
   - **Annually**: contributes its full cost only to the specific month it bills (not amortised).
   Subscriptions with no `nextBillingDate` are excluded. Current month bar highlighted in accent blue.

6. **Upcoming renewals panel** (right column): Sorted list of subscriptions due in next 30 days. Days-until badge, amber colouring for ≤ 7 days.

7. **Possible Savings card** (right column, below renewals): Shows one affiliate suggestion — the highest-spend subscription that has a known alternative. Links to Alternatives view for more.

### Subscriptions List

Full table of all subscriptions with:
- Search (name filter, live)
- Filter dropdowns: Category, Status
- Sort: Name, Cost (asc/desc), Next Renewal
- Columns: Star, Name, Category, Cost + cycle, Next Renewal, Status, Actions
- **Star/favourite:** Cosmetic only in v1. Starred subscriptions display a filled star icon (amber). No sort priority or filter behaviour — serves as a visual marker for the user.
- Per-row actions: Edit (opens modal), overflow menu (⋯) for quick status change and delete

**Add/Edit modal:** Single form, pre-populated on edit. Fields:
- Name (text, required)
- Category (dropdown, 10 options)
- Status (Active / Paused / Cancelled)
- Cost (number, required)
- Currency (GBP / USD / EUR / CAD / AUD)
- Billing Cycle (Monthly / Quarterly / Annually / Weekly)
- Next Billing Date (date picker, optional — if omitted, subscription is excluded from renewals list and sparkline)
- Notes (text, optional)

Cost is stored as entered. Monthly equivalent is computed on the fly for dashboard totals:
- Weekly × 52 / 12
- Quarterly / 3
- Annually / 12

### Alternatives

Full-page view of all affiliate suggestions. Two tiers:

**Tier 1 — Known service matches:** For each user subscription whose name exactly matches (case-insensitive, leading/trailing whitespace trimmed) a key in `KNOWN_SERVICES`, render a card showing: current service, suggested alternative, estimated saving, CTA button with affiliate link, and a subtle "affiliate link" label. Matching is exact after normalisation — no fuzzy/partial matching in v1.

**Tier 2 — Category fallbacks:** For categories where no known-service match exists, render a generic category-level suggestion from `CATEGORY_FALLBACKS`.

`data/affiliates.js` structure:
```js
const KNOWN_SERVICES = {
  "netflix":   { alt: "Amazon Prime Video", saving: "~£9/mo", url: "AFFILIATE_URL" },
  "spotify":   { alt: "YouTube Premium",    saving: "~£1/mo", url: "AFFILIATE_URL" },
  "adobe cc":  { alt: "Affinity Suite",     saving: "~£47/mo (one-off)", url: "AFFILIATE_URL" },
  // ~30 common services
}

const CATEGORY_FALLBACKS = {
  "Streaming":       { alt: "Check Freesat / Freeview",         url: "AFFILIATE_URL" },
  "Software / SaaS": { alt: "Browse open-source alternatives",  url: "AFFILIATE_URL" },
  // one fallback per category
}
```

**Affiliate URL population is a separate content task.** During implementation, all `url` values use the placeholder string `"AFFILIATE_URL"`. Real affiliate URLs must be substituted before the site goes live. The implementer must not ship placeholder strings to production.

All CTA links open in a new tab (`target="_blank" rel="noopener"`).

### Export

Three actions on this page:
- **Export JSON** — full `localStorage` data dump, filename `subsight-backup-YYYY-MM-DD.json`
- **Export CSV** — columns: Name, Category, Cost, Currency, Cycle, Status, Next Billing Date, Notes
- **Import JSON** — file picker → validate → prompt (Merge / Replace) → write to localStorage → reload.
  - **Validation:** File must be valid JSON containing a `subsight_subscriptions` array. Each entry must have `id`, `name`, `cost`, `category`, `billingCycle`, `status`, and `currency` with values matching their allowed enums. Invalid individual entries are skipped with a summary count shown to the user; if the entire file fails to parse or has no subscriptions array, show an error and abort.
  - **Replace:** Clear all existing subscriptions and write imported set.
  - **Merge:** Deduplicate by `id` — imported subscriptions whose `id` does not exist locally are appended. Imported subscriptions whose `id` already exists locally are skipped (existing record takes precedence).

Privacy copy reinforced: *"Your backup file stays on your device. We never see it."*

### Settings

- Default currency selector (pre-fills currency on new subscriptions)
- Waste alert threshold (default £1,500/year, user-adjustable)
- Danger zone: "Clear all data" (confirmation required)

---

## Privacy Requirements

- No external HTTP requests of any kind (except user-initiated affiliate link clicks)
- No external fonts — system font stack only
- No analytics, tracking pixels, or third-party scripts
- No cookies — `localStorage` only
- No "sign up" or account flow — stated explicitly as a feature
- Persistent footer: *"100% private — all data stored locally on your device. Nothing is sent to any server."*

---

## Affiliate Transparency

Every affiliate link must display a visible "affiliate link" label adjacent to the CTA. No hidden redirects. The Alternatives page includes a brief disclosure paragraph at the top.

---

## Out of Scope (v1)

- Multi-currency conversion (costs displayed as-entered; if all active subscriptions share a single currency the dashboard sums and displays normally; if multiple currencies are present, the monthly/annual totals display "Multiple currencies — see list" and the stat cards suppress numeric totals to avoid misleading sums)
- Sharing or syncing between devices
- Push/email renewal reminders
- OCR or bank import
- Dark/light mode toggle (dark only for v1)
