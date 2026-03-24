// ============================================================
// email-parser.js  —  Email → Subscription data extractor
// Privacy-first: 100% client-side, zero network requests.
// Architecture: two-pass (labeled patterns → generic fallback)
// ============================================================

const EMAIL_PARSER = (() => {

  // ── Constants ────────────────────────────────────────────
  const MONTH_MAP = {
    jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
    jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
    january:1, february:2, march:3, april:4, june:6,
    july:7, august:8, september:9, october:10, november:11, december:12
  };

  const CURRENCY_SYMBOLS = { '£': 'GBP', '€': 'EUR', '$': 'USD' };
  const VALID_CURRENCIES  = ['GBP', 'USD', 'EUR', 'CAD', 'AUD'];

  // Known sender domains → brand name (for emails with no price like giffgaff)
  const SKIP_DOMAINS = new Set([
    'gmail','yahoo','hotmail','protonmail','outlook','icloud',
    'amazonses','notifications','mail','mailer','noreply','no-reply',
    'sgpvcsmail','2checkout','service','gov'
  ]);

  // ── Date helpers ─────────────────────────────────────────

  function parseDate(raw) {
    if (!raw) return null;
    let s = raw.trim();
    // Strip ordinal suffixes: 1st→1, 2nd→2, 3rd→3, 4th→4 …
    s = s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
    let m;

    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;

    // DD/MM/YYYY  (UK format — treat as day/month when day > 12 or unambiguous)
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      const d = +m[1], mo = +m[2];
      // Prefer DD/MM when d > 12 (impossible as month), otherwise assume DD/MM (UK)
      return `${m[3]}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }

    // D Mon YYYY  →  "31 Mar 2026", "09 March 2026"
    m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) {
      const mo = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
      if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    }

    // Mon D YYYY  →  "March 1, 2026", "March 1 2026"
    m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
      const mo = MONTH_MAP[m[1].toLowerCase().slice(0, 3)];
      if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`;
    }

    return null;
  }

  function isFuturish(dateStr) {
    // Accept dates not more than 90 days in the past
    const d = new Date(dateStr);
    return !isNaN(d) && d >= new Date(Date.now() - 90 * 86400000);
  }

  function cycleFromDateRange(startStr, endStr) {
    const s = new Date(startStr), e = new Date(endStr);
    if (isNaN(s) || isNaN(e)) return null;
    const days = Math.round(Math.abs(e - s) / 86400000);
    if (days >= 6   && days <= 8)   return 'Weekly';
    if (days >= 28  && days <= 33)  return 'Monthly';
    if (days >= 85  && days <= 96)  return 'Quarterly';
    if (days >= 358 && days <= 368) return 'Annually';
    return null;
  }

  // ── Currency extraction ───────────────────────────────────

  function extractCurrency(text) {
    for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (text.includes(sym)) return code;
    }
    for (const code of VALID_CURRENCIES) {
      if (new RegExp('\\b' + code + '\\b').test(text)) return code;
    }
    return null;
  }

  // ── Price extraction ─────────────────────────────────────

  function extractPrice(text) {
    const candidates = [];

    // Symbol + amount:  £2.59  £ 11.45  €18.99
    const symRe = /[£€$]\s*(\d{1,6}(?:[.,]\d{2})?)/g;
    let m;
    while ((m = symRe.exec(text)) !== null) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v > 0 && v < 10000) candidates.push(v);
    }

    // Amount + currency code:  99.99 GBP  18.99 EUR
    const codeRe = /(\d{1,6}(?:[.,]\d{2})?)\s*(?:GBP|USD|EUR|CAD|AUD)\b/gi;
    while ((m = codeRe.exec(text)) !== null) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v > 0 && v < 10000) candidates.push(v);
    }

    if (!candidates.length) return null;

    // Return most-frequently-occurring value (handles Total + Item price repeats)
    const freq = {};
    candidates.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return parseFloat(sorted[0][0]);
  }

  // ── Billing cycle extraction ──────────────────────────────

  function extractBillingCycle(text) {
    const t = text.toLowerCase();
    if (/\/(?:year|yr)\b|per year|annual|yearly|\b12[\s\-]month|\(1[\s\-]year\)|1[\s\-]year\b|subscription \(1 year\)/.test(t))
      return 'Annually';
    if (/\/month\b|per month|monthly|each month/.test(t))
      return 'Monthly';
    if (/\/quarter\b|quarterly|every 3 month|3[\s\-]month/.test(t))
      return 'Quarterly';
    if (/\/week\b|weekly|per week/.test(t))
      return 'Weekly';
    return null;
  }

  // ── Next billing date extraction ──────────────────────────

  function extractNextBillingDate(text) {
    // Pass 1: labeled date patterns (high confidence)
    const labeledPatterns = [
      /(?:next\s+(?:billing|payment)(?:\s+date)?|payment\s+date)\s*[:\-]?\s*([A-Z0-9][^\n\r,;]{2,25})/i,
      /(?:renew(?:s|al)?\s+on|will\s+(?:automatically\s+)?renew\s+on)\s*[:\-]?\s*([A-Z0-9][^\n\r,;]{2,25})/i,
      /(?:date\s+of\s+first\s+collection|first\s+collection\s+date)\s*[:\-]?\s*([0-9][^\n\r,;]{3,20})/i,
      /(?:charged\s+(?:on|as\s+of)|billed\s+on)\s*[:\-]?\s*([A-Z0-9][^\n\r,;]{2,25})/i,
      /(?:expire[sd]?\s+on|expiry\s+date)\s*[:\-]?\s*([A-Z0-9][^\n\r,;]{2,20})/i,
    ];

    for (const re of labeledPatterns) {
      const m = text.match(re);
      if (m) {
        const d = parseDate(m[1].trim());
        if (d) return d;
      }
    }

    // Pass 2: generic date scan — collect all futurish dates, return soonest
    const datePatterns = [
      /\b(\d{4}-\d{2}-\d{2})\b/g,
      /\b(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/gi,
      /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/gi,
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    ];

    const found = [];
    for (const re of datePatterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const d = parseDate(m[1]);
        if (d && isFuturish(d)) found.push(d);
      }
    }

    return found.length ? found.sort()[0] : null;
  }

  // ── Service name extraction ───────────────────────────────

  function cleanName(s) {
    return s.replace(/\s+/g, ' ')
            .replace(/\s*[,:]\s*$/, '')   // trailing punctuation
            .trim();
  }

  function extractName(text, subject) {
    let m;

    // "1 x Product Name"  (2Checkout / Verifone)
    m = text.match(/\b1\s+x\s+([A-Z][^\n\r]{5,80}?)(?=\s*[.]\s|\s*\n|\s+Renewal|\s+subscription)/i);
    if (m) return cleanName(m[1]);

    // Google Play receipt: "Item   Price\n  AppName (details)"
    m = text.match(/Item\s+Price\s+([\w][\w\s:,.!-]+?)(?:\s*\(|\s*[£€$])/i);
    if (m) return cleanName(m[1]);

    // "subscription for X (" or "subscription for X will"
    m = text.match(/subscription\s+for\s+([^()\n\r]{5,60}?)\s*(?:\(|\s+will\s|\s+from\s|\s+on\s)/i);
    if (m) return cleanName(m[1]);

    // NHS / gov.uk pattern
    if (/prescription\s+prepayment\s+certificate|ppc\b/i.test(text)) {
      return 'NHS Prescription Prepayment Certificate';
    }

    // Subject: "subscription for X will renew"
    m = subject && subject.match(/subscription\s+for\s+([^()]{5,60}?)\s+will\s/i);
    if (m) return cleanName(m[1]);

    // Subject: "X Auto-renewal Notification"
    m = subject && subject.match(/^(.+?)\s+(?:auto-?renewal\s+notification|auto-?renewal)/i);
    if (m) return cleanName(m[1]);

    // Subject: "Subscription renewal information for X"
    m = subject && subject.match(/(?:renewal\s+information\s+for|subscription\s+renewal\s+for)\s+(.+)/i);
    if (m) return cleanName(m[1]);

    return null;
  }

  // ── Main parse function ───────────────────────────────────

  function parse(text, subject, fromAddress) {
    subject     = (subject     || '').trim();
    fromAddress = (fromAddress || '').toLowerCase();

    const r = {
      name:            null,
      cost:            null,
      currency:        null,
      billingCycle:    null,
      nextBillingDate: null,
      confidence:      0,
      partial:         false,
    };

    r.name     = extractName(text, subject);
    r.cost     = extractPrice(text);
    const foundCurrency = extractCurrency(text);
    r.currency = foundCurrency || 'GBP';
    r.billingCycle    = extractBillingCycle(text);
    r.nextBillingDate = extractNextBillingDate(text);

    // Billing cycle from start/end date range  (e.g. giffgaff)
    if (!r.billingCycle) {
      const sm = text.match(/[Ss]tart\s+date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
      const em = text.match(/[Ee]nd\s+date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (sm && em) {
        const sd = parseDate(sm[1]);
        const ed = parseDate(em[1]);
        r.billingCycle    = cycleFromDateRange(sd, ed) || 'Monthly';
        if (!r.nextBillingDate && ed && isFuturish(ed)) r.nextBillingDate = ed;
      }
    }

    // Default billing cycle
    if (!r.billingCycle) r.billingCycle = 'Monthly';

    // Sender brand fallback for name  (e.g. "no_reply@info4.giffgaff.com" → "giffgaff")
    if (!r.name && fromAddress) {
      // Extract registered domain (penultimate segment, handles subdomains)
      const dm = fromAddress.match(/@(?:[a-z0-9-]+\.)*([a-z0-9-]+)\.[a-z]{2,}(?:\.[a-z]{2})?/i);
      if (dm && !SKIP_DOMAINS.has(dm[1])) {
        r.name = dm[1].charAt(0).toUpperCase() + dm[1].slice(1);
      }
    }

    // Confidence score (0–100); currency only counts if found in text (not defaulted)
    r.confidence = (r.name ? 20 : 0)
                 + (r.cost !== null ? 40 : 0)
                 + (r.billingCycle ? 15 : 0)
                 + (r.nextBillingDate ? 15 : 0)
                 + (foundCurrency ? 10 : 0);
    r.partial = r.cost === null;

    return r;
  }

  // ── .eml file parser ─────────────────────────────────────

  function b64Decode(str) {
    const clean = str.replace(/[\r\n\s]/g, '');
    if (!clean) return '';
    try {
      const bytes   = atob(clean);
      const uint8   = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) uint8[i] = bytes.charCodeAt(i);
      return new TextDecoder('utf-8').decode(uint8);
    } catch (_) {
      try { return atob(clean); } catch (__) { return ''; }
    }
  }

  function extractMimePart(raw, contentType) {
    // Extract MIME boundary from outer headers (used to delimit parts)
    const bMatch   = raw.match(/boundary="([^"]+)"/i) || raw.match(/boundary=([^\s;"\r\n]+)/i);
    const boundary = bMatch ? bMatch[1] : null;

    const ctRe = new RegExp(
      'Content-Type:\\s*' + contentType.replace('/', '\\/') + '[^\\r\\n]*', 'i'
    );
    const ctMatch = ctRe.exec(raw);
    if (!ctMatch) return null;

    const fromCt    = raw.substring(ctMatch.index);
    const bodyStart = fromCt.search(/\r?\n\r?\n/);
    if (bodyStart < 0) return null;

    const headers = fromCt.substring(0, bodyStart);
    let   body    = fromCt.substring(bodyStart + 2).replace(/^\r?\n/, '');

    // Trim at the next MIME boundary using the exact declared boundary string
    if (boundary) {
      const marker = '\r\n--' + boundary;
      const boundaryEnd = body.indexOf(marker);
      if (boundaryEnd >= 0) body = body.substring(0, boundaryEnd);
    }

    if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
      body = b64Decode(body);
    } else if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) {
      body = body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }

    return body.trim();
  }

  function stripHtml(html) {
    try {
      const div   = document.createElement('div');
      div.innerHTML = html;
      return (div.textContent || div.innerText || '')
        .replace(/\s+/g, ' ').trim();
    } catch (_) {
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ').trim();
    }
  }

  function parseEml(raw) {
    if (!raw || raw.length > 1_000_000) return null; // 1 MB guard

    const subject = (raw.match(/^Subject:\s*(.+)/im)  || [])[1] || '';
    const from    = (raw.match(/^From:\s*(.+)/im)     || [])[1] || '';

    // Prefer plain text — already human-readable, fewer false positives
    const plainBody = extractMimePart(raw, 'text/plain');
    if (plainBody && plainBody.length > 30) {
      return { body: plainBody, subject, from };
    }

    // Fall back to HTML
    const htmlRaw = extractMimePart(raw, 'text/html');
    if (htmlRaw) {
      const body = stripHtml(htmlRaw);
      if (body.length > 30) return { body, subject, from };
    }

    return null;
  }

  // ── Public API ────────────────────────────────────────────
  return { parse, parseEml };

})();
