# Alternatives Recommendation Logic

This document explains how Sub-Site decides which alternative subscriptions to suggest on the **Alternatives** page.

---

## Overview

The engine runs entirely in the browser against the user's saved subscriptions. No external API is called. Recommendations are drawn from two static lookup tables in `data/affiliates.js`:

| Table | Purpose |
|---|---|
| `KNOWN_SERVICES` | Named service → specific cheaper alternative |
| `CATEGORY_FALLBACKS` | Category name → generic category-level suggestion |

The page only renders if the user has at least one **Active** subscription. Paused and cancelled subscriptions are ignored entirely.

---

## Step 1 — Tier 1: Exact Service Matching

### How a match is found

For each active subscription, the service name is trimmed and lowercased:

```
"Netflix Premium" → "netflix premium"
"Netflix"         → "netflix"
```

This normalised key is looked up directly in `KNOWN_SERVICES`. The table has 200 entries with keys already in lowercase (e.g. `'netflix'`, `'claude pro'`, `'adobe cc'`).

**Important:** this is a strict equality check — `'netflix premium'` will NOT match the `'netflix'` key. The lookup requires an exact key match after lowercasing and trimming. There is no fuzzy or partial matching.

### Deduplication

If the user has entered the same service more than once (e.g. two Netflix rows), only the entry with the **highest monthly equivalent cost** is kept. This prevents duplicate cards for the same service.

Monthly cost normalisation converts all billing cycles to a monthly figure:
- Monthly → cost as-is
- Annual → cost ÷ 12
- Weekly → cost × 52 ÷ 12
- Quarterly → cost ÷ 3

### Ranking

Matched services are sorted by monthly spend **descending** — the most expensive subscription appears first, on the logic that it represents the biggest saving opportunity.

### What a Tier 1 card shows

| Field | Source |
|---|---|
| Title | `{subscription name} → {alternative name}` |
| Subtitle | What the user is currently paying and how often |
| Price badge | `price` field if set (e.g. `£5.99/mo`), otherwise falls back to `Save {saving}` |
| Button | "Visit" link to `homepage` (plain direct link) — only rendered if `homepage` is non-null |
| Button label | "Direct link, not affiliated" while `url === 'AFFILIATE_URL'`; "Affiliate link" once live |

---

## Step 2 — Tier 2: Category Fallbacks

### When Tier 2 activates

After Tier 1 runs, the engine collects the **categories of all matched subscriptions**. Any category that already has a Tier 1 match is excluded from Tier 2. This avoids suggesting generic alternatives alongside specific ones for the same category.

For each remaining active subscription category, `CATEGORY_FALLBACKS` is checked. If a fallback exists for that category, a generic suggestion card is shown.

### Current fallback categories

`CATEGORY_FALLBACKS` covers 10 categories including Streaming, Software / SaaS, Cloud Storage, Gaming, Productivity, Finance, Health & Fitness, News & Media, Music, and Other.

### What a Tier 2 card shows

| Field | Source |
|---|---|
| Title | `{category name} alternative` |
| Subtitle | The `alt` description from `CATEGORY_FALLBACKS` |
| Button | "Learn More" link to `homepage` — only rendered if `homepage` is non-null |

Tier 2 cards do not show a saving amount — they are directional suggestions, not price comparisons.

---

## Dashboard "Possible Savings" widget

The dashboard right column shows a single **Possible Savings** card. The logic here is simpler and independent of the Alternatives page:

1. All active subscriptions are sorted by monthly cost descending.
2. The engine iterates through them and finds the **first one** that has a key match in `KNOWN_SERVICES`.
3. That single match is displayed as a teaser, with a link to the Alternatives page for the full list.

---

## Data structure reference

### `KNOWN_SERVICES` entry

```js
'netflix': {
  alt:          'Amazon Prime Video',  // the suggested alternative name
  saving:       '~£9/mo',             // estimated monthly saving (fallback display string)
  url:          'AFFILIATE_URL',       // affiliate link placeholder — replace before going live
  homepage:     'https://www.amazon.co.uk/gp/video/offers', // direct link to the alternative (shown until affiliate live)
  price:        '£5.99/mo',           // current verified price of the alternative (null if free or unknown)
  lastVerified: '2026-03'             // YYYY-MM when price/homepage was last manually checked (null if unverified)
}
```

**Field behaviour in the UI:**
- `price` is shown as the badge if non-null; otherwise `'Save ' + saving` is shown
- The "Visit" button is only rendered if `homepage` is non-null
- The button label shows `'Direct link, not affiliated'` while `url === 'AFFILIATE_URL'`; it switches to `'Affiliate link'` automatically once real affiliate links are set
- Entries with `homepage: null` (e.g. built-in OS features like Apple Mail, Windows Defender) still show a card but with no button

### `CATEGORY_FALLBACKS` entry

```js
'Streaming': {
  alt:          'Check Freesat / Freeview for free TV',
  url:          'AFFILIATE_URL',
  homepage:     'https://www.freesat.co.uk',
  price:        null,
  lastVerified: '2026-03'
}
```

### `KNOWN_SERVICE_CATEGORIES` (auto-fill)

A separate map of `{ 'service key': 'Category' }` is used by the **Add Subscription modal** to auto-populate the category dropdown when a user types a recognised service name. This is display-only and does not affect the alternatives logic.

---

## Limitations and edge cases

| Scenario | Behaviour |
|---|---|
| Service name typed differently (e.g. "Netflx") | **No match** — there is no fuzzy matching |
| Service entered with extra words (e.g. "Netflix Premium") | **No match** unless that exact key exists in `KNOWN_SERVICES` |
| Service in a non-default currency | Matched normally; saving string is shown as-is from the table (GBP-denominated) |
| Multiple subscriptions in the same category, some matched | Only unmatched categories get Tier 2 cards |
| `AFFILIATE_URL` placeholder not replaced | Button shows "Direct link, not affiliated" and links to `homepage` — the `AFFILIATE_URL` placeholder is never shown to users |
| `homepage: null` | Card renders with the price badge but no button — common for built-in alternatives (Apple Mail, Windows Defender, etc.) |

---

## How to extend the recommendation data

### Adding a new exact-match service

Add an entry to `KNOWN_SERVICES` in `data/affiliates.js`:

```js
'your service name': {
  alt:          'Cheaper Alternative',
  saving:       '~£X/mo',
  url:          'AFFILIATE_URL',
  homepage:     'https://the-alternative.com/pricing',
  price:        '£X.XX/mo',     // or null if free
  lastVerified: 'YYYY-MM'
},
```

- Key must be **lowercase** and match what users are likely to type exactly.
- Add multiple keys for common variants (`'disney+'` and `'disney plus'` both exist, for example).
- Also add the key to `KNOWN_SERVICE_CATEGORIES` so the modal category auto-fill works.
- Add the key + monitoring URL to `public/data/monitored-urls.json` if the service is price-volatile.

### Adding a new category fallback

```js
'Your Category': {
  alt:          'Generic suggestion text',
  url:          'AFFILIATE_URL',
  homepage:     'https://relevant-resource.com',
  price:        null,
  lastVerified: 'YYYY-MM'
},
```

The category string must exactly match one of the 10 category values used in the subscription form.

### Replacing affiliate URLs

Search for `AFFILIATE_URL` across `data/affiliates.js` and replace each with the real affiliate link for the corresponding service or category. Once any entry has a non-placeholder `url`, the disclosure in the UI automatically switches from "Direct link, not affiliated" to "Affiliate link".

---

## Price monitoring pipeline

Pricing data is kept fresh via a weekly Gitea Actions workflow — **not scraping**. The workflow detects that a pricing page's content has changed and alerts you to check manually.

### Files involved

| File | Purpose |
|---|---|
| `public/data/monitored-urls.json` | The ~20 high-volatility services to monitor, as `{ key, url }` pairs |
| `data/price-hashes.json` | Stored content hashes from the last run (committed to git, updated by workflow) |
| `scripts/check-prices.mjs` | Node 20 ESM script that fetches each URL and compares hashes |
| `.gitea/workflows/price-monitor.yml` | Weekly cron workflow — runs Monday 08:00 UTC |

### How it works

1. The workflow runs on a weekly cron (or manually via `workflow_dispatch`)
2. `check-prices.mjs` fetches each URL in `monitored-urls.json` with a polite 1.5s delay
3. Page content (title text + first currency/price pattern) is hashed with SHA-256
4. Hashes are compared against `data/price-hashes.json`
5. If any hash changed: exit code 1 is returned, the workflow commits updated hashes to a new branch and opens a PR via the Gitea API
6. You review the PR, manually visit the changed service's pricing page, update `price` and `lastVerified` in `affiliates.js`, and merge

### On transient failures

Network errors and non-200 responses are logged as `SKIP` and do not update the stored hash. This prevents a temporary outage from triggering a false PR.
