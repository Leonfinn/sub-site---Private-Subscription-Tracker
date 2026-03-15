// js/ui.js

// ── Helpers ──────────────────────────────────────────────────────────────────

function _currencySymbol(code) {
  return { GBP: '£', USD: '$', EUR: '€', CAD: 'CA$', AUD: 'A$' }[code] || code;
}

function _formatCost(sub) {
  return _currencySymbol(sub.currency) + parseFloat(sub.cost).toFixed(2);
}

function _formatCycle(cycle) {
  return { Monthly: 'monthly', Quarterly: 'quarterly', Annually: 'annually', Weekly: 'weekly' }[cycle] || cycle.toLowerCase();
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function _emptyState(message) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.textContent = message;
  return div;
}

// ── Subscriptions List ────────────────────────────────────────────────────────

function renderSubscriptionsList(subs) {
  const container = document.getElementById('subsTableContainer');
  const summary   = document.getElementById('subs-summary');
  const searchEl  = document.getElementById('subsSearch');
  const catEl     = document.getElementById('subsCategory');
  const statusEl  = document.getElementById('subsStatus');
  const sortEl    = document.getElementById('subsSort');
  const addBtn    = document.getElementById('addSubBtn');
  if (!container) return;

  // Populate category dropdown once
  if (catEl && catEl.options.length <= 1) {
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catEl.appendChild(opt);
    });
  }

  // Wire toolbar events once
  function _rerender() { renderSubscriptionsList(getAllSubscriptions()); }
  if (searchEl && !searchEl._bound) { searchEl._bound = true; searchEl.addEventListener('input', _rerender); }
  if (catEl    && !catEl._bound)    { catEl._bound    = true; catEl.addEventListener('change', _rerender); }
  if (statusEl && !statusEl._bound) { statusEl._bound = true; statusEl.addEventListener('change', _rerender); }
  if (sortEl   && !sortEl._bound)   { sortEl._bound   = true; sortEl.addEventListener('change', _rerender); }
  if (addBtn   && !addBtn._bound)   { addBtn._bound   = true; addBtn.addEventListener('click', () => openModal(null)); }

  // Update summary counts
  if (summary) {
    const active    = subs.filter(s => s.status === 'Active').length;
    const paused    = subs.filter(s => s.status === 'Paused').length;
    const cancelled = subs.filter(s => s.status === 'Cancelled').length;
    summary.textContent = `${active} active · ${paused} paused · ${cancelled} cancelled`;
  }

  // Filter
  const search = (searchEl ? searchEl.value : '').toLowerCase();
  const catFilter    = catEl    ? catEl.value    : '';
  const statusFilter = statusEl ? statusEl.value : '';
  const sortVal      = sortEl   ? sortEl.value   : 'name-asc';

  let filtered = subs.filter(s => {
    if (search && !s.name.toLowerCase().includes(search)) return false;
    if (catFilter && s.category !== catFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (sortVal) {
      case 'name-desc':    return b.name.localeCompare(a.name);
      case 'cost-desc':    return monthlyEquivalent(b) - monthlyEquivalent(a);
      case 'cost-asc':     return monthlyEquivalent(a) - monthlyEquivalent(b);
      case 'renewal-asc': {
        const da = a.nextBillingDate || '9999-12-31';
        const db = b.nextBillingDate || '9999-12-31';
        return da.localeCompare(db);
      }
      default:             return a.name.localeCompare(b.name);
    }
  });

  // Render
  container.innerHTML = '';
  if (filtered.length === 0) {
    container.appendChild(_emptyState('No subscriptions match your filters.'));
    return;
  }

  const table = document.createElement('table');
  table.className = 'sub-table';
  table.innerHTML = `<thead><tr>
    <th></th><th>Name</th><th>Category</th><th>Cost</th><th>Next Renewal</th><th>Status</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  filtered.forEach(sub => {
    const tr = document.createElement('tr');

    // Star cell
    const starTd = document.createElement('td');
    const starBtn = document.createElement('button');
    starBtn.className = 'action-btn';
    starBtn.style.background = 'none';
    starBtn.style.padding = '0 4px';
    const starSpan = document.createElement('span');
    starSpan.className = 'star' + (sub.starred ? '' : ' empty');
    starSpan.textContent = sub.starred ? '★' : '☆';
    starBtn.appendChild(starSpan);
    starBtn.addEventListener('click', () => {
      saveSubscription({ ...sub, starred: !sub.starred });
    });
    starTd.appendChild(starBtn);

    // Name cell
    const nameTd = document.createElement('td');
    const nameDiv = document.createElement('div');
    nameDiv.className = 'sub-name';
    nameDiv.textContent = sub.name;
    nameTd.appendChild(nameDiv);

    // Category cell
    const catTd = document.createElement('td');
    const catBadge = document.createElement('span');
    catBadge.className = 'category-badge';
    catBadge.textContent = sub.category;
    catTd.appendChild(catBadge);

    // Cost cell
    const costTd = document.createElement('td');
    const costDiv = document.createElement('div');
    costDiv.className = 'cost';
    costDiv.textContent = _formatCost(sub);
    const cycleDiv = document.createElement('div');
    cycleDiv.className = 'cycle';
    cycleDiv.textContent = _formatCycle(sub.billingCycle);
    costTd.appendChild(costDiv);
    costTd.appendChild(cycleDiv);

    // Renewal cell
    const renewTd = document.createElement('td');
    renewTd.style.color = '#64748b';
    renewTd.style.fontSize = '13px';
    renewTd.textContent = _formatDate(sub.nextBillingDate);

    // Status cell
    const statusTd = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge ' + sub.status.toLowerCase();
    statusBadge.textContent = sub.status;
    statusTd.appendChild(statusBadge);

    // Actions cell
    const actionsTd = document.createElement('td');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openModal(sub));

    const moreBtn = document.createElement('button');
    moreBtn.className = 'action-btn';
    moreBtn.textContent = '⋯';
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close any existing open menus
      document.querySelectorAll('.overflow-menu').forEach(m => m.remove());

      const menu = document.createElement('div');
      menu.className = 'overflow-menu';

      STATUSES.filter(s => s !== sub.status).forEach(newStatus => {
        const btn = document.createElement('button');
        btn.textContent = 'Set ' + newStatus;
        btn.addEventListener('click', () => {
          saveSubscription({ ...sub, status: newStatus });
          menu.remove();
        });
        menu.appendChild(btn);
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.style.color = '#f87171';
      delBtn.addEventListener('click', () => {
        if (confirm('Delete "' + sub.name + '"? This cannot be undone.')) {
          deleteSubscription(sub.id);
        }
        menu.remove();
      });
      menu.appendChild(delBtn);

      moreBtn.style.position = 'relative';
      moreBtn.appendChild(menu);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(moreBtn);
    actionsTd.appendChild(actionsDiv);

    tr.appendChild(starTd);
    tr.appendChild(nameTd);
    tr.appendChild(catTd);
    tr.appendChild(costTd);
    tr.appendChild(renewTd);
    tr.appendChild(statusTd);
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  // Close overflow menus on outside click
  if (!document._overflowListenerBound) {
    document._overflowListenerBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.overflow-menu').forEach(m => m.remove());
    });
  }
}

// ── Stub functions (filled in later tasks) ────────────────────────────────────

function renderDashboard(subs, settings) { /* Task 13 */ }
function renderModal(sub) { /* Task 12 */ }
function renderAlternatives(subs) { /* Task 15 */ }
function renderExport() { /* Task 16 */ }
function renderSettings(settings) { /* Task 17 */ }
