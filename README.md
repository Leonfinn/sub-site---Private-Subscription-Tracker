# SubSight — Subscription Tracker

A privacy-first subscription spending tracker built as a static website. All data is stored in your browser's localStorage—no server, no accounts, no build step.

## Features

- **Dashboard**: Overview with annual spending, monthly trend sparkline, upcoming renewals, and category breakdown
- **Subscription Management**: Add, edit, delete, search, filter, and sort subscriptions
- **Alternatives**: Discover cheaper alternatives with tier-1 per-service matches and tier-2 category fallbacks
- **Export**: Download your data as JSON backup or CSV spreadsheet
- **Import**: Restore from JSON backup with merge or replace options
- **Settings**: Configure default currency (GBP/USD/EUR/CAD/AUD), waste alert threshold, and data management
- **100% Private**: All data stays in your browser. No analytics, no tracking, no external requests

## Tech Stack

- **Pure HTML5 / CSS3 / Vanilla ES6+** — no build step, no npm, no frameworks
- **localStorage** — all data stored client-side
- **Dark theme** — CSS custom properties with `#0a0f1e` base and `#38bdf8` accent
- **Responsive design** — desktop sidebar and mobile bottom navigation

## File Structure

```
.
├── index.html              # Single-page app shell
├── css/
│   └── style.css           # All styles (dark theme, responsive)
├── js/
│   ├── app.js              # Routing, navigation, view switching
│   ├── storage.js          # localStorage CRUD operations
│   ├── charts.js           # Category bar chart & trend sparkline
│   └── ui.js               # All view templates and renders
├── data/
│   └── affiliates.js       # 35+ known services + category fallbacks
├── tests/
│   ├── runner.html         # Browser-based test harness
│   ├── lib/assert.js       # Test utilities
│   └── test-*.js           # Unit tests (app, storage, charts, ui)
├── docs/                   # Additional documentation
└── LICENSE                 # License file
```

## Getting Started

### Run Locally

1. **Clone or download the project**
2. **Open `index.html` in a browser** — that's it
   - Or use a local server: `python3 -m http.server 8000` and visit `http://localhost:8000`

### Run Tests

Open `tests/runner.html` in a browser to run the full test suite.

## Deployment

SubSight can be deployed to any static host:

- **GitHub Pages**: Push to a repository, enable GitHub Pages in settings, and your site is live
- **Netlify**: Drag the folder to Netlify, configure build settings to none (since no build step required)
- **Any static host** (Vercel, AWS S3, etc.): Upload the entire directory

## Before Going Live

Replace all `AFFILIATE_URL` placeholder strings in `data/affiliates.js` with real affiliate links for your chosen partners.

## Privacy & Security

- **No server backend** — all computation happens in your browser
- **No tracking** — no analytics, no external requests
- **No font CDN** — uses system font stack
- **Transparent storage** — all data stored openly in `localStorage` (browser dev tools can inspect it)

## Browser Compatibility

SubSight requires a modern browser with support for:
- ES6+ (Arrow functions, template literals, const/let)
- localStorage API
- CSS custom properties
- CSS Grid and Flexbox

Supported: Chrome/Edge 51+, Firefox 31+, Safari 9.1+

## License

See LICENSE file for details.
