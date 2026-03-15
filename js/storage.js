// js/storage.js

const CATEGORIES = [
  'Streaming', 'Software / SaaS', 'Cloud Storage', 'Gaming', 'Music',
  'News / Media', 'Health & Fitness', 'Finance', 'Productivity', 'Other'
];
const CURRENCIES   = ['GBP', 'USD', 'EUR', 'CAD', 'AUD'];
const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Annually', 'Weekly'];
const STATUSES     = ['Active', 'Paused', 'Cancelled'];
const SCHEMA_VERSION = 1;

const KEYS = {
  VERSION:  'subsight_schema_version',
  SUBS:     'subsight_subscriptions',
  BANNER:   'subsight_trust_banner_dismissed',
  SETTINGS: 'subsight_settings'
};

const DEFAULT_SETTINGS = { defaultCurrency: 'GBP', wasteAlertThreshold: 1500 };

function _notify() {
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
  switch (sub.billingCycle) {
    case 'Weekly':    return (cost * 52) / 12;
    case 'Quarterly': return cost / 3;
    case 'Annually':  return cost / 12;
    default:          return cost;
  }
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
