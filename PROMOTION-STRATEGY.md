# Sub-Site Promotion Strategy

> Research: DeepSeek R1 (strategist) + DeepSeek V3 (critic) + Gemini (independent review). March 2026.
> Solo operator, ~2hrs/week, near-zero budget (up to £20/month if justified).

---

## TL;DR — 90-Day Focus

1. **Before anything else:** Add OG tags + meta description — takes 30 minutes, affects every link ever shared.
2. **Week 1–2:** Lurk `/r/UKPersonalFinance` and `/r/Privacy`. Learn the language, spot the pain points.
3. **Week 3:** Post the Reddit launch. Be responsive for 48 hours.
4. **Ongoing:** Manual Reddit monitoring 2×/week. Pitch 1–2 UK newsletters per month.
5. **Track one metric only:** Weekly Active Users (WAU).

---

## Positioning (Decide Before Promoting)

**Primary message: "Privacy-first subscription tracker"**
Lead with no-login, data-stays-in-browser. This differentiates immediately from every
data-hungry competitor and builds trust upfront.

**Secondary hook (SEO + content only): "Find cheaper alternatives"**
Use this framing in page titles, guide content, and community posts. It drives affiliate
revenue long-term but must not be the first thing a user sees on the site.

**Why this order matters:** Leading with "find alternatives" looks like an affiliate spam site.
Leading with privacy builds trust. Users who convert on that basis are retained users.

---

## Channel Rankings

### 1. Reddit — Best ROI, Do First

| Subreddit | Why |
|---|---|
| `/r/UKPersonalFinance` | Highest intent for a UK-focused tool |
| `/r/Privacy` | Privacy angle resonates strongly |
| `/r/personalfinance` | Large US-leaning audience, still relevant |
| `/r/Frugal` | Cost-saving focus |
| `/r/SideProject` | "I built this" launch post |

**Execution:**
- Spend 1–2 weeks lurking before posting. Understand current pain points.
- Launch post title: *"I built a free tool that tracks your subscriptions 100% in your browser. No login, no data stored. Helped me save £40/month."*
- Be responsive to every comment for 48 hours (drives algorithm visibility).
- Do NOT cross-post the same link to multiple subs within a short window — instant spam flag.

**Ongoing monitoring (no tools needed):**
Use Reddit's native search twice a week:
`"forgot to cancel" OR "subscription spending" subreddit:UKPersonalFinance`
Reply helpfully. Only mention Sub-Site if it's genuinely the solution. 15 min, high signal.

**Avoid:** IFTTT/Mention for automated monitoring — generates too much noise.

---

### 2. UK Personal Finance Newsletters — Best Conversion Quality

Higher conversion per reader than Reddit. One featured mention reaches hundreds of
engaged, high-intent readers. Pitch for free feature slots, not paid sponsorship.

**UK targets:**
- **The Wallet** (UK personal finance newsletter)
- **The FIRE Shoutout** (UK financial independence community)
- **Money Saving Expert Weekly Tips** (high bar, but worth trying — mention the privacy angle)
- Any UK personal finance Substack with a "tools" or "reader resources" section

**Global targets:**
- **TLDR Newsletter** (tldr.tech) — "Cool Tools" section
- **The Browser** (thebrowser.com) — "Recommends" section
- **PrivacyTools.io** community newsletter

**Effort:** Write one 150-word pitch email. Personalise per newsletter. No automation. Send 1–2 per month.

---

### 3. Hacker News — High Ceiling, One Shot

A strong Show HN post can drive 5,000–20,000 visits in 24 hours. Do not rush this.
Wait until the Reddit launch has generated genuine user feedback and the Alternatives
feature is live.

**Format:** `Show HN: Sub-Site – track subscriptions privately, all data in your browser`

---

### 4. IndieHackers — Community + Passive SEO

Post a genuine build journey milestone (e.g. "0 to 500 users with no budget").
These posts rank well on Google and attract tool-curious builders.

---

### 5. Product Hunt — Wait

Do not launch until:
- 50–100 genuine engaged users exist (for authentic upvotes + comments)
- App is out of beta
- OG image and social assets are ready
- 5–10 hunters in productivity/finance space have been contacted for feedback (not upvotes)

A failed PH launch (< 50 upvotes) creates lasting negative social proof.

---

## Channels to Avoid

| Channel | Why |
|---|---|
| TikTok / Instagram Reels | High content effort, wrong audience for a privacy tool |
| Twitter/X organic | Building a following is a full-time job. Account for announcements only. |
| Facebook / Instagram | Useless for this tool. |
| LinkedIn | Wrong intent for personal subscription tracking. |
| Paid PPC ads | £20/month buys almost nothing at finance keyword CPC rates. |
| Generic "best budgeting apps" blog posts | Cannot compete with established personal finance sites. |
| Automated DMs or cross-posting bots | Banned everywhere, damages reputation. |

---

## SEO Strategy

**The problem:** SPAs loaded via JavaScript are poorly indexed by Google. Sub-Site currently
has no meta description, OG tags, or structured data.

### Step 1 — Immediate fixes (30 minutes, do before any promotion)

Add to `<head>` of `public/index.html`:

```html
<meta name="description" content="Free, private subscription tracker. No login required — all data stays in your browser. Track spending, set renewal alerts, find cheaper alternatives.">
<meta property="og:title" content="Sub-Site — Private Subscription Tracker">
<meta property="og:description" content="Track all your subscriptions privately. No account needed. 100% in your browser.">
<meta property="og:url" content="https://sub-site.com">
<meta property="og:type" content="website">
<meta property="og:image" content="https://sub-site.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
```

Also create an OG image (1200×630px): clean dashboard screenshot with "Sub-Site" branding.
Tools: Canva (free) or Figma (free).

### Step 2 — One comprehensive guide page (medium-term)

Create a single static HTML page at `/guide/manage-subscriptions.html`:

> **Title:** "How to Track and Manage Your Subscriptions Without Sharing Your Data"
> **Keywords:** "subscription management guide", "track subscriptions privately", "subscription tracker no login"

Why one page and not many? You cannot rank for "Netflix alternative" against established
comparison sites. One well-targeted guide on the privacy+management angle has a realistic chance.

### Step 3 — "How to cancel" pages (3 pages max, Gemini-sourced insight)

Target people already frustrated with a service — they are one step away from cancelling:

- `/guide/cancel-netflix.html` → "How to Cancel Netflix UK (and Track What You're Paying For)"
- `/guide/cancel-adobe-cc.html` → "How to Cancel Adobe Creative Cloud (And Find Cheaper Alternatives)"
- `/guide/cancel-amazon-prime.html` → "How to Cancel Amazon Prime UK"

Each page ends with a CTA to Sub-Site. Competition is high for generic queries but manageable
for UK-specific long-tail variants like "cancel Netflix UK" or "cancel Adobe CC and track alternatives".

### Step 4 — SPA prerendering (optional, only if needed)

If Google Search Console shows crawl issues after OG tags are live, add a Cloudflare Worker
that detects bot user-agents and serves a static HTML snapshot of the SPA. This is free on
the Cloudflare Workers free tier and solves 95% of SPA indexing problems. Only implement if
there is evidence of a real crawl problem.

---

## Automation Stack (All Free)

| Task | Tool | Cost | Notes |
|---|---|---|---|
| Social scheduling | Buffer (free plan) | Free | 3 evergreen posts rotating weekly on X. No daily posting. |
| Brand monitoring | Google Alerts | Free | Alerts for "sub-site.com" + "subscription tracker" |
| Reddit monitoring | Reddit native search | Free | 15 min, 2×/week — no tool needed |
| Newsletter pitching | Gmail templates | Free | Write once, personalise per send |
| Session recording | Hotjar (free tier) | Free | Review 10 sessions/week — one user insight beats 100hrs of promotion guesswork |

---

## Feature Roadmap for Promotion Support

### Already shipped — mention in Reddit/HN posts
- **CSV Export** — built and live. Promotable feature; mention it when posting ("exports to CSV for your own records").
- **Savings Calculator** — built and live at `/calculator.html`, linked from the sidebar. Pre-populates from existing app data via shared localStorage.

### Priority 1: "My subscriptions cost £X/year" Share Card
DeepSeek R1 rated this highly; DeepSeek V3 cautioned that users may hesitate to share
subscription costs publicly (privacy/stigma). Build it, but after CSV export and calculator.
Implementation: `html2canvas` (client-side, no server needed).
Pre-filled text: *"I track my £[X]/year in subscriptions with Sub-Site — a free app that keeps all my data in my browser."*

---

## Free Partnership / Directory Submissions

| Target | Action | Effort |
|---|---|---|
| AlternativeTo.net | Create a listing | 20 min — indexed by Google, free backlink |
| PrivacyTools.io | Submit for directory listing | 20 min |
| 12ft.io | Email pitch: "complementary privacy tool" cross-mention | 15 min |
| Library Extension | Same cross-promotion pitch | 15 min |
| Product Hunt "Upcoming" | Add before launch to build a follower list | 10 min |

---

## 30-Day Quick Wins Checklist

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | Add meta description + OG tags to `index.html` | 30 min | High — every shared link looks professional |
| 2 | Create OG image (1200×630) | 1 hr | High — social sharing |
| 3 | Submit listing to AlternativeTo.net | 20 min | Medium — SEO backlink, passive discovery |
| 4 | Lurk `/r/UKPersonalFinance` + `/r/Privacy` | 2 hrs over 2 weeks | Foundation for launch post |
| 5 | Write and post Reddit launch | 1 hr + 2 hrs engagement | High if post resonates |
| 6 | Set up Google Alerts for brand name | 5 min | Always-on, low effort |
| 7 | Set up Buffer with 3 evergreen posts | 30 min | Background awareness |
| 8 | Write newsletter pitch template | 30 min | High if it lands |

---

## AI Research Notes

| Agent | Role | Key contributions |
|---|---|---|
| DeepSeek R1 | Strategist | Channel rankings, Reddit execution plan, SPA prerendering, WAU metric, framing decision |
| DeepSeek V3 | Critic | Challenged PH timing, swapped share card for CSV export, added UK newsletter targets, manual Reddit monitoring over IFTTT |
| Gemini | Independent review | "How to cancel [service]" SEO angle, savings calculator concept — other advice not applicable (assumed funded startup with mobile app) |
