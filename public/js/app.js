// js/app.js

/* ── Theme management ─────────────────────────────────── */
const THEME_KEY = 'subsite_theme';

function _applyTheme(mode) {
  if (mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  // Update all toggle icons and aria state
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  const toggle = document.getElementById('themeToggle');
  const mobileToggle = document.getElementById('themeToggleMobile');
  if (mode === 'light') {
    if (icon) icon.textContent = '☀️';
    if (label) label.textContent = 'Dark mode';
    if (toggle) toggle.setAttribute('aria-checked', 'false');
    if (mobileToggle) { mobileToggle.childNodes[0].textContent = '☀️'; }
  } else {
    if (icon) icon.textContent = '🌙';
    if (label) label.textContent = 'Dark mode';
    if (toggle) toggle.setAttribute('aria-checked', 'true');
    if (mobileToggle) { mobileToggle.childNodes[0].textContent = '🌙'; }
  }
}

function _toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  _applyTheme(next);
}

// Apply saved theme immediately (before DOM ready to avoid flash)
(function() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved !== 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function initApp() {
  if (!localStorage.getItem(KEYS.VERSION)) {
    localStorage.setItem(KEYS.VERSION, SCHEMA_VERSION);
  }
  renderCurrentView();
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
  document.addEventListener('subsight:updated', () => {
    renderCurrentView();
    _updateSaveStatus('saved');
  });
  document.addEventListener('subsight:exported', () => _renderSaveStatus());

  // Wire theme toggle(s)
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', _toggleTheme);
    themeToggle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _toggleTheme(); }
    });
  }
  const themeToggleMobile = document.getElementById('themeToggleMobile');
  if (themeToggleMobile) {
    themeToggleMobile.addEventListener('click', _toggleTheme);
  }
  // Apply correct initial state for icons/labels
  _applyTheme(localStorage.getItem(THEME_KEY) || 'light');
}

let _currentView = 'dashboard';

function navigate(view) {
  _currentView = view;
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle('active', el.id === 'view-' + view);
  });
  // Update mobile header page title
  const pageTitles = { dashboard: 'Dashboard', subscriptions: 'Subscriptions', alternatives: 'Alternatives', export: 'Export & Import', settings: 'Settings' };
  const mpt = document.getElementById('mobilePageTitle');
  if (mpt) mpt.textContent = pageTitles[view] || '';
  renderCurrentView();
}

function renderCurrentView() {
  const subs = getAllSubscriptions();
  const settings = getSettings();
  switch (_currentView) {
    case 'dashboard':      renderDashboard(subs, settings); break;
    case 'subscriptions':  renderSubscriptionsList(subs); break;
    case 'alternatives':   renderAlternatives(subs); break;
    case 'export':         renderExport(); break;
    case 'settings':       renderSettings(settings); break;
  }
}

function openModal(sub = null) {
  renderModal(sub);
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  _wireImportButton();
  _handleUrlParams();
  _initSaveStatus();
  _initUnloadGuard();
});

function _initUnloadGuard() {
  window.addEventListener('beforeunload', e => {
    const subs = getAllSubscriptions();
    if (!subs.length) return; // nothing to lose
    const exportTs = localStorage.getItem(_EXPORT_TS_KEY);
    const daysSinceExport = exportTs
      ? Math.floor((Date.now() - parseInt(exportTs, 10)) / 86_400_000)
      : Infinity;
    if (daysSinceExport > _BACKUP_NUDGE_DAYS) {
      e.preventDefault();
      e.returnValue = ''; // required for Chrome
    }
  });
}

function _wireImportButton() {
  const btn = document.getElementById('importEmailBtn');
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener('click', () => showImportModal());
  }
}

// ── Save status indicator ─────────────────────────────────

const _SAVE_TS_KEY  = 'subsight_last_save_ts';
const _EXPORT_TS_KEY = 'subsight_last_export_ts';
const _BACKUP_NUDGE_DAYS = 30;
let _saveStatusTimer = null;

function _initSaveStatus() {
  // Wire click → Export view on both desktop and mobile indicators
  ['saveStatus', 'saveStatusMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => navigate('export'));
  });

  // Record a save timestamp now if one doesn't exist (first visit)
  if (!localStorage.getItem(_SAVE_TS_KEY)) {
    localStorage.setItem(_SAVE_TS_KEY, Date.now().toString());
  }

  _renderSaveStatus();

  // Refresh the time-ago label every 60 seconds
  setInterval(_renderSaveStatus, 60_000);
}

function _updateSaveStatus(event) {
  if (event === 'saved') {
    try {
      localStorage.setItem(_SAVE_TS_KEY, Date.now().toString());
    } catch (_) { /* QuotaExceededError — storage full */ }
  }
  _renderSaveStatus();
}

function _timeAgo(ts) {
  if (!ts) return 'just now';
  const secs = Math.floor((Date.now() - parseInt(ts, 10)) / 1000);
  if (secs < 10)  return 'just now';
  if (secs < 60)  return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function _renderSaveStatus() {
  const exportTs = localStorage.getItem(_EXPORT_TS_KEY);
  const daysSinceExport = exportTs
    ? Math.floor((Date.now() - parseInt(exportTs, 10)) / 86_400_000)
    : Infinity;

  const needsBackup = daysSinceExport > _BACKUP_NUDGE_DAYS;
  const exportLabel = exportTs ? _timeAgo(exportTs) : null;

  const text  = needsBackup ? 'Back up your data' : `Backed up · ${exportLabel}`;
  const title = needsBackup
    ? `No backup in ${daysSinceExport === Infinity ? 'a while' : daysSinceExport + ' days'} — click to export`
    : `Last export: ${exportLabel}. Click to export another backup.`;

  const configs = [
    { id: 'saveStatus',       nudgeClass: 'save-status--nudge' },
    { id: 'saveStatusMobile', nudgeClass: 'save-status-mobile--nudge' },
  ];
  configs.forEach(({ id, nudgeClass }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle(nudgeClass, needsBackup);
    el.title = title;
    const textEl = el.querySelector('[id$="Text"]');
    if (textEl) textEl.textContent = text;
  });
}

// iOS Shortcut flow: ?text=<encoded>, or ?name=&cost=&currency=&cycle=&date=
function _handleUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (!p.has('text') && !p.has('name') && !p.has('cost')) return;

  if (p.has('text')) {
    // Parse the shared text and open import modal pre-filled
    const text = p.get('text');
    if (text && text.trim().length > 10) {
      navigate('subscriptions');
      setTimeout(() => {
        showImportModal();
        // Dispatch synthetic input to textarea after modal opens
        setTimeout(() => {
          const ta = document.querySelector('.import-textarea');
          if (ta) {
            ta.value = text;
            ta.dispatchEvent(new Event('input'));
          }
        }, 100);
      }, 50);
    }
  } else {
    // Direct field params: open subscription form pre-filled
    const prefill = {
      name:            p.get('name')     || '',
      cost:            parseFloat(p.get('cost')) || null,
      currency:        p.get('currency') || 'GBP',
      billingCycle:    p.get('cycle')    || 'Monthly',
      nextBillingDate: p.get('date')     || null,
      category:        p.get('category') || 'Other',
      status:          'Active',
      notes:           '',
    };
    navigate('subscriptions');
    setTimeout(() => openModal(prefill), 100);
  }

  // Clean URL params without reloading
  const clean = window.location.pathname;
  window.history.replaceState({}, '', clean);
}
