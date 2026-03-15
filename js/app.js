// js/app.js
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

document.addEventListener('DOMContentLoaded', initApp);
