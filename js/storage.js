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
