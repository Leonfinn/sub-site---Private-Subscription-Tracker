// js/storage.js

const CATEGORIES = [
  'Streaming', 'Music', 'Gaming', 'Cloud Storage',
  'Software / SaaS', 'Apps', 'Education',
  'Security & Privacy', 'Finance', 'Health & Fitness',
  'News & Media', 'Other'
];

// Migrate legacy category names in localStorage to the current taxonomy.
// Run once on startup before any reads.
function migrateLegacyCategories() {
  const MAP = {
    'News / Media':  'News & Media',
    'Productivity':  'Apps',
  };
  const raw = localStorage.getItem(KEYS.SUBS);
  if (!raw) return;
  try {
    const subs = JSON.parse(raw);
    let changed = false;
    subs.forEach(s => {
      if (MAP[s.category]) { s.category = MAP[s.category]; changed = true; }
    });
    if (changed) localStorage.setItem(KEYS.SUBS, JSON.stringify(subs));
  } catch (e) { /* ignore parse errors */ }
}
const CURRENCIES   = ['GBP', 'USD', 'EUR', 'CAD', 'AUD'];
const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Annually', 'Weekly'];
const STATUSES     = ['Active', 'Paused', 'Cancelled', 'Wishlist'];
const SCHEMA_VERSION = 1;

const KEYS = {
  VERSION:   'subsight_schema_version',
  SUBS:      'subsight_subscriptions',
  BANNER:    'subsight_trust_banner_dismissed',
  SETTINGS:  'subsight_settings',
  CHANGE_TS: 'subsight_last_change_ts',
  AUDIT_TS:  'subsight_last_audit_ts',
};

const DEFAULT_SETTINGS = { defaultCurrency: 'GBP', wasteAlertThreshold: 1500 };

function _notify() {
  try { localStorage.setItem(KEYS.CHANGE_TS, Date.now().toString()); } catch (_) {}
  const subs = typeof getAllSubscriptions === 'function' ? getAllSubscriptions() : [];
  document.dispatchEvent(new CustomEvent('subsight:updated', {
    detail: { subscriptions: subs, settings: getSettings() }
  }));
}

function _generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Settings ---
function getSettings() {
  try {
    return Object.assign({}, DEFAULT_SETTINGS,
      JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}'));
  } catch { return Object.assign({}, DEFAULT_SETTINGS); }
}

function saveSettings(updates) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(Object.assign(getSettings(), updates)));
  _notify();
}

// --- Banner ---
function isBannerDismissed() {
  return localStorage.getItem(KEYS.BANNER) === 'true';
}

function dismissBanner() {
  localStorage.setItem(KEYS.BANNER, 'true');
}

// --- Subscriptions ---
function getAllSubscriptions() {
  try { return JSON.parse(localStorage.getItem(KEYS.SUBS) || '[]'); }
  catch { return []; }
}

function saveSubscription(sub) {
  const subs = getAllSubscriptions();
  if (!sub.id) sub = { ...sub, id: _generateId() };
  const idx = subs.findIndex(s => s.id === sub.id);
  if (idx >= 0) subs[idx] = sub; else subs.push(sub);
  localStorage.setItem(KEYS.SUBS, JSON.stringify(subs));
  _notify();
  return sub;
}

function deleteSubscription(id) {
  localStorage.setItem(KEYS.SUBS,
    JSON.stringify(getAllSubscriptions().filter(s => s.id !== id)));
  _notify();
}

function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  _notify();
}

// --- Calculations ---
function monthlyEquivalent(sub) {
  if (sub.status !== 'Active') return 0;
  const cost = parseFloat(sub.cost) || 0;
  const split = (sub.splitWays && sub.splitWays > 1) ? sub.splitWays : 1;
  let monthly;
  switch (sub.billingCycle) {
    case 'Weekly':    monthly = (cost * 52) / 12; break;
    case 'Quarterly': monthly = cost / 3; break;
    case 'Annually':  monthly = cost / 12; break;
    default:          monthly = cost; break;
  }
  return monthly / split;
}

function getActiveSubs(subs) {
  return subs.filter(s => s.status === 'Active');
}

function isMultiCurrency(subs) {
  return new Set(getActiveSubs(subs).map(s => s.currency)).size > 1;
}

function totalMonthlySpend(subs) {
  return getActiveSubs(subs).reduce((sum, s) => sum + monthlyEquivalent(s), 0);
}

function categoryBreakdown(subs) {
  return getActiveSubs(subs).reduce((acc, s) => {
    const cat = s.category || 'Other';
    acc[cat] = (acc[cat] || 0) + monthlyEquivalent(s);
    return acc;
  }, {});
}

function upcomingRenewals(subs, days = 30) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86400000);
  return subs
    .filter(s => s.status === 'Active' && s.nextBillingDate)
    .map(s => ({ ...s, daysUntil: Math.ceil((new Date(s.nextBillingDate) - now) / 86400000) }))
    .filter(s => s.daysUntil >= 0 && new Date(s.nextBillingDate) <= cutoff)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// --- Export / Import ---
const REQUIRED_FIELDS = ['id', 'name', 'cost', 'category', 'billingCycle', 'status', 'currency'];

function _isValidSub(s) {
  return REQUIRED_FIELDS.every(f => s[f] !== undefined && s[f] !== null && s[f] !== '') &&
    BILLING_CYCLES.includes(s.billingCycle) &&
    STATUSES.includes(s.status) &&
    CURRENCIES.includes(s.currency) &&
    CATEGORIES.includes(s.category);
}

function _contentFingerprint(s) {
  return [
    (s.name || '').trim().toLowerCase(),
    String(s.cost),
    (s.currency || '').toUpperCase(),
    s.billingCycle,
    s.status,
    s.category
  ].join('|');
}

function importJSON(jsonString, mode) {
  let data;
  try { data = JSON.parse(jsonString); }
  catch (e) { return { ok: false, error: 'Failed to parse JSON: ' + e.message }; }

  if (!data.subsight_subscriptions || !Array.isArray(data.subsight_subscriptions)) {
    return { ok: false, error: 'File must contain a subsight_subscriptions array.' };
  }

  const valid   = data.subsight_subscriptions.filter(_isValidSub);
  const invalid = data.subsight_subscriptions.length - valid.length;

  if (mode === 'replace') {
    localStorage.setItem(KEYS.SUBS, JSON.stringify(valid));
    _notify();
    return { ok: true, added: valid.length, dupeSkipped: 0, invalid };
  }

  // Merge mode: deduplicate by ID first, then by content fingerprint
  const existing = getAllSubscriptions();
  const existingById          = new Map(existing.map(s => [s.id, s]));
  const existingByFingerprint = new Map(existing.map(s => [_contentFingerprint(s), s]));

  let added = 0, dupeSkipped = 0;

  for (const s of valid) {
    if (existingById.has(s.id)) { dupeSkipped++; continue; }

    const fpMatch = existingByFingerprint.get(_contentFingerprint(s));
    if (fpMatch) {
      // Content duplicate — keep existing record; refresh next billing date if imported is newer
      if (s.nextBillingDate && s.nextBillingDate > (fpMatch.nextBillingDate || '')) {
        fpMatch.nextBillingDate = s.nextBillingDate;
      }
      dupeSkipped++;
      continue;
    }

    existing.push(s);
    existingById.set(s.id, s);
    existingByFingerprint.set(_contentFingerprint(s), s);
    added++;
  }

  localStorage.setItem(KEYS.SUBS, JSON.stringify(existing));
  _notify();
  return { ok: true, added, dupeSkipped, invalid };
}

async function exportJSON() {
  const data = {
    subsight_schema_version: SCHEMA_VERSION,
    subsight_subscriptions: getAllSubscriptions(),
    subsight_settings: getSettings()
  };
  await _triggerDownload(
    JSON.stringify(data, null, 2),
    `subsite-backup-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  );
  _recordExport();
}

async function exportCSV() {
  const headers = ['Name','Category','Cost','Currency','Billing Cycle','Status','Next Billing Date','Notes'];
  const rows = getAllSubscriptions().map(s => [
    s.name, s.category, s.cost, s.currency, s.billingCycle,
    s.status, s.nextBillingDate || '', s.notes || ''
  ]);
  const csv = [headers, ...rows].map(r => r.map(_escapeCsv).join(',')).join('\n');
  await _triggerDownload(csv, `subsite-export-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  _recordExport();
}

function _recordExport() {
  try { localStorage.setItem('subsight_last_export_ts', Date.now().toString()); } catch (_) {}
  // Notify app.js to refresh the save status indicator
  document.dispatchEvent(new CustomEvent('subsight:exported'));
}

function _escapeCsv(val) {
  const str = String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? '"' + str.replace(/"/g, '""') + '"'
    : str;
}

async function _triggerDownload(content, filename, type) {
  // Use File System Access API when available (Chrome/Edge) — gives native
  // save dialog with folder picker and filename editing.
  if (window.showSaveFilePicker) {
    try {
      const ext = filename.split('.').pop();
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: type, accept: { [type]: ['.' + ext] } }],
        startIn: 'downloads'
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([content], { type }));
      await writable.close();
      return;
    } catch (e) {
      // User cancelled the dialog — do nothing
      if (e.name === 'AbortError') return;
      // API failed for another reason — fall through to legacy download
    }
  }
  // Fallback for Firefox / Safari: standard anchor-click download
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function sparklineData(subs) {
  const now = new Date();
  const curYear  = now.getFullYear();
  const curMonth = now.getMonth(); // 0-indexed

  return Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;                          // 5 months ago → current
    let tMonth = curMonth - offset;
    let tYear  = curYear;
    while (tMonth < 0) { tMonth += 12; tYear -= 1; }
    const tAbs = tYear * 12 + tMonth;

    let total = 0;
    getActiveSubs(subs).forEach(s => {
      if (!s.nextBillingDate) return;
      const cost = parseFloat(s.cost) || 0;
      const next = new Date(s.nextBillingDate);
      const nAbs = next.getFullYear() * 12 + next.getMonth();
      const diff = nAbs - tAbs;

      switch (s.billingCycle) {
        case 'Monthly':    if (diff >= 0)                    total += cost; break;
        case 'Weekly':     total += (cost * 52) / 12;                       break;
        case 'Quarterly':  if (diff >= 0 && diff % 3  === 0) total += cost; break;
        case 'Annually':   if (diff >= 0 && diff % 12 === 0) total += cost; break;
      }
    });

    const d = new Date(tYear, tMonth, 1);
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      total,
      isCurrent: offset === 0
    };
  });
}
