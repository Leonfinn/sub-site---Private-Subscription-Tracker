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
  document.addEventListener('subsight:updated', () => renderCurrentView());

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
});

function _wireImportButton() {
  const btn = document.getElementById('importEmailBtn');
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener('click', () => showImportModal());
  }
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
