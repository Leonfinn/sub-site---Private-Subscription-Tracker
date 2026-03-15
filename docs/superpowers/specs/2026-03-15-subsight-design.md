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

`app.js` owns in-memory state (array of subscription objects). Any mutation goes through `storage.js`, which persists to `localStorage` and fires a custom DOM event. `ui.js` listens and re-renders the affected view. No framework, no virtual DOM — imperative DOM updates only.

### localStorage Schema

```json
{
  "subsight_subscriptions": [],
  "subsight_trust_banner_dismissed": true,
  "subsight_settings": { "defaultCurrency": "GBP" }
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
  "lastUsed": "2026-03-10",
  "notes": ""
}
```

**Fields:**
- `billingCycle`: `"Monthly"` | `"Quarterly"` | `"Annually"` | `"Weekly"`
- `status`: `"Active"` | `"Paused"` | `"Cancelled"`
- `currency`: `"GBP"` | `"USD"` | `"EUR"` | `"CAD"` | `"AUD"`
- `category`: one of 10 fixed options (see UI section)

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

2. **Waste alert** (shown when projected annual spend > £1,500): Amber banner — *"Heads up: You're spending £X/year on subscriptions. The average person wastes £624/year on services they barely use — have you reviewed yours lately?"*

3. **Stat cards row (3 cards):**
   - Monthly spend (accent blue, large)
   - Annual spend (projected: monthly equivalent × 12)
   - Renewals due in next 30 days (count)

4. **Category bar chart:** Horizontal bars, one per category that has spend. Pure CSS/SVG — no chart library. Proportional widths, colour-coded by category.

5. **Monthly trend sparkline:** Vertical bars for last 6 months of monthly spend totals. Computed from `nextBillingDate` history. Current month highlighted in accent blue.

6. **Upcoming renewals panel** (right column): Sorted list of subscriptions due in next 30 days. Days-until badge, amber colouring for ≤ 7 days.

7. **Possible Savings card** (right column, below renewals): Shows one affiliate suggestion — the highest-spend subscription that has a known alternative. Links to Alternatives view for more.

### Subscriptions List

Full table of all subscriptions with:
- Search (name filter, live)
- Filter dropdowns: Category, Status
- Sort: Name, Cost (asc/desc), Next Renewal
- Columns: Star, Name, Category, Cost + cycle, Next Renewal, Status, Actions
- Per-row actions: Edit (opens modal), overflow menu (⋯) for quick status change and delete

**Add/Edit modal:** Single form, pre-populated on edit. Fields:
- Name (text, required)
- Category (dropdown, 10 options)
- Status (Active / Paused / Cancelled)
- Cost (number, required)
- Currency (GBP / USD / EUR / CAD / AUD)
- Billing Cycle (Monthly / Quarterly / Annually / Weekly)
- Next Billing Date (date picker)
- Notes (text, optional)

Cost is stored as entered. Monthly equivalent is computed on the fly for dashboard totals:
- Weekly × 52 / 12
- Quarterly / 3
- Annually / 12

### Alternatives

Full-page view of all affiliate suggestions. Two tiers:

**Tier 1 — Known service matches:** For each user subscription whose name fuzzy-matches (case-insensitive, trimmed) a key in `KNOWN_SERVICES`, render a card showing: current service, suggested alternative, estimated saving, CTA button with affiliate link, and a subtle "affiliate link" label.

**Tier 2 — Category fallbacks:** For categories where no known-service match exists, render a generic category-level suggestion from `CATEGORY_FALLBACKS`.

`data/affiliates.js` structure:
```js
const KNOWN_SERVICES = {
  "netflix":   { alt: "Amazon Prime Video", saving: "~£9/mo", url: "https://..." },
  "spotify":   { alt: "YouTube Premium",    saving: "~£1/mo", url: "https://..." },
  "adobe cc":  { alt: "Affinity Suite",     saving: "~£47/mo (one-off)", url: "https://..." },
  // ~30 common services
}

const CATEGORY_FALLBACKS = {
  "Streaming":       { alt: "Check Freesat / Freeview",         url: "https://..." },
  "Software / SaaS": { alt: "Browse open-source alternatives",  url: "https://..." },
  // one per category
}
```

All CTA links open in a new tab (`target="_blank" rel="noopener"`).

### Export

Three actions on this page:
- **Export JSON** — full `localStorage` data dump, filename `subsight-backup-YYYY-MM-DD.json`
- **Export CSV** — columns: Name, Category, Cost, Currency, Cycle, Status, Next Billing Date, Notes
- **Import JSON** — file picker → validate → prompt (Merge / Replace) → write to localStorage → reload

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

- Multi-currency conversion (costs displayed as-entered; dashboard sums same-currency subs only, flags mixed currencies)
- Sharing or syncing between devices
- Push/email renewal reminders
- OCR or bank import
- Dark/light mode toggle (dark only for v1)
