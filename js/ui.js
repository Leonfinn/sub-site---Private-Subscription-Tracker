// js/ui.js

// ── Helpers ──────────────────────────────────────────────────────────────────

// Toast notification — survives view re-renders (attached to body, not a view)
function _showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

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
    const emptyWrap = document.createElement('div');
    emptyWrap.className = 'page-empty-state';
    emptyWrap.innerHTML = `
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="empty-state-icon">
        <rect x="8" y="14" width="40" height="28" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M8 22h40" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <rect x="16" y="28" width="10" height="2" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="16" y="33" width="6" height="2" rx="1" fill="currentColor" opacity="0.3"/>
        <circle cx="42" cy="42" r="8" fill="var(--bg-panel)" stroke="currentColor" stroke-width="2"/>
        <path d="M42 38v4M42 44v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="empty-state-text">No subscriptions found. Add your first one with the button above.</div>
    `;
    container.appendChild(emptyWrap);
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

function renderDashboard(subs, settings) {
  // Date subtitle
  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Add button
  const dashAddBtn = document.getElementById('dashAddBtn');
  if (dashAddBtn && !dashAddBtn._bound) { dashAddBtn._bound = true; dashAddBtn.addEventListener('click', () => openModal(null)); }

  // Trust banner
  const bannerEl = document.getElementById('trust-banner');
  if (bannerEl) {
    bannerEl.innerHTML = '';
    if (!isBannerDismissed()) {
      const banner = document.createElement('div');
      banner.className = 'trust-banner';
      const text = document.createElement('div');
      text.className = 'trust-banner-text';
      text.innerHTML = '🔒 <strong>Your data never leaves this device.</strong> Sub-Site runs entirely in your browser — no accounts, no servers, no tracking.';
      const dismiss = document.createElement('span');
      dismiss.className = 'trust-dismiss';
      dismiss.textContent = '×';
      dismiss.addEventListener('click', () => { dismissBanner(); banner.style.display = 'none'; });
      banner.appendChild(text);
      banner.appendChild(dismiss);
      bannerEl.appendChild(banner);
    }
  }

  // Waste alert
  const alertEl = document.getElementById('waste-alert');
  if (alertEl) {
    alertEl.innerHTML = '';
    const multiCurr = isMultiCurrency(subs);
    const monthly = totalMonthlySpend(subs);
    const annual = monthly * 12;
    const threshold = settings.wasteAlertThreshold ?? 1500;
    if (!multiCurr && annual > threshold) {
      const activeSubs = subs.filter(s => s.status === 'Active');
      const currCode = activeSubs.length > 0 ? activeSubs[0].currency : (settings.defaultCurrency || 'GBP');
      const sym = _currencySymbol(currCode);
      const alertDiv = document.createElement('div');
      alertDiv.className = 'waste-alert';
      alertDiv.innerHTML = `⚠️ <strong>Heads up:</strong> You're spending ${sym}${annual.toFixed(0)}/year on subscriptions. The average person wastes £624/year on services they barely use — have you reviewed yours lately?`;
      alertEl.appendChild(alertDiv);
    }
  }

  // Stat cards
  const statsRow = document.getElementById('stats-row');
  if (statsRow) {
    statsRow.innerHTML = '';
    const multiCurr = isMultiCurrency(subs);
    const monthly = totalMonthlySpend(subs);
    const activeSubs = subs.filter(s => s.status === 'Active');
    const currCode = activeSubs.length > 0 ? activeSubs[0].currency : (settings.defaultCurrency || 'GBP');
    const sym = _currencySymbol(currCode);
    const renewals = upcomingRenewals(subs, 30);

    function makeStatCard(label, value, valueCls, sub) {
      const card = document.createElement('div');
      card.className = 'stat-card';
      const lbl = document.createElement('div'); lbl.className = 'stat-label'; lbl.textContent = label;
      const val = document.createElement('div'); val.className = 'stat-value' + (valueCls ? ' ' + valueCls : ''); val.textContent = value;
      const s = document.createElement('div'); s.className = 'stat-sub'; s.textContent = sub;
      card.appendChild(lbl); card.appendChild(val); card.appendChild(s);
      return card;
    }

    const monthlyVal  = multiCurr ? 'Multiple currencies' : sym + monthly.toFixed(2);
    const annualVal   = multiCurr ? 'Multiple currencies' : sym + (monthly * 12).toFixed(0);
    statsRow.appendChild(makeStatCard('Monthly Spend',  monthlyVal, 'accent', `across ${activeSubs.length} active subscription${activeSubs.length !== 1 ? 's' : ''}`));
    statsRow.appendChild(makeStatCard('Annual Spend',   annualVal,  '',       'projected this year'));
    statsRow.appendChild(makeStatCard('Due This Month', String(renewals.length), '', 'renewals in next 30 days'));
  }

  // Charts column
  const chartsCol = document.getElementById('charts-col');
  if (chartsCol) {
    chartsCol.innerHTML = '';

    // Hero feature panels — only shown when no subscriptions yet
    if (subs.filter(s => s.status === 'active').length === 0) {
      const hero = document.createElement('div');
      hero.className = 'hero-features';

      const features = [
        {
          icon: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="20" width="48" height="30" rx="4" stroke="currentColor" stroke-width="2.5" fill="none"/>
            <rect x="8" y="28" width="48" height="8" fill="currentColor" opacity="0.15"/>
            <path d="M16 38h8M16 42h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M44 14l8 6-8 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20 14h32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>`,
          title: 'ADD SUBSCRIPTIONS',
          desc: 'Track every subscription in one place — streaming, software, fitness and more.'
        },
        {
          icon: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="16" width="44" height="38" rx="4" stroke="currentColor" stroke-width="2.5" fill="none"/>
            <path d="M10 26h44" stroke="currentColor" stroke-width="2" opacity="0.4"/>
            <rect x="20" y="10" width="4" height="12" rx="2" fill="currentColor"/>
            <rect x="40" y="10" width="4" height="12" rx="2" fill="currentColor"/>
            <rect x="18" y="32" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.5"/>
            <rect x="28" y="32" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.8"/>
            <rect x="38" y="32" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.3"/>
            <circle cx="46" cy="46" r="8" fill="var(--bg-panel)" stroke="currentColor" stroke-width="2"/>
            <path d="M46 42v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>`,
          title: 'TRACK RENEWALS',
          desc: 'Never be surprised by a renewal. See upcoming charges weeks in advance.'
        },
        {
          icon: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 48l12-14 10 8 12-18 10-10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="48" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M48 16v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M44 24c0 0 1.5 2.5 4 2.5s4-2.5 4-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>`,
          title: 'SAVE MONEY',
          desc: 'Spot waste and find cheaper alternatives. Sub-Site shows you where to cut costs.'
        }
      ];

      features.forEach((f, i) => {
        const panel = document.createElement('div');
        panel.className = 'hero-panel hero-panel-btn';
        panel.setAttribute('role', 'button');
        panel.setAttribute('tabindex', '0');
        panel.innerHTML = `
          <div class="hero-icon">${f.icon}</div>
          <div class="hero-panel-title">${f.title}</div>
          <div class="hero-panel-desc">${f.desc}</div>
        `;
        // Wire click action
        if (i === 0) {
          // ADD SUBSCRIPTIONS → open the add modal
          panel.addEventListener('click', () => openModal(null));
          panel.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(null); } });
          panel.title = 'Click to add your first subscription';
        } else if (i === 1) {
          // TRACK RENEWALS → go to Subscriptions page, sort by renewal date
          panel.addEventListener('click', () => {
            navigate('subscriptions');
            // Set sort dropdown to renewal after navigation (next tick)
            setTimeout(() => {
              const sortEl = document.getElementById('subsSort');
              if (sortEl) { sortEl.value = 'renewal-asc'; sortEl.dispatchEvent(new Event('change')); }
            }, 50);
          });
          panel.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); panel.click(); } });
          panel.title = 'Click to view subscriptions sorted by renewal date';
        } else if (i === 2) {
          // SAVE MONEY → go to Alternatives page
          panel.addEventListener('click', () => navigate('alternatives'));
          panel.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('alternatives'); } });
          panel.title = 'Click to see money-saving alternatives';
        }
        hero.appendChild(panel);
      });

      chartsCol.appendChild(hero);
    }

    const catCard = document.createElement('div'); catCard.className = 'card';
    const catTitle = document.createElement('div'); catTitle.className = 'card-title'; catTitle.textContent = 'Spend by Category';
    catCard.appendChild(catTitle);
    catCard.appendChild(renderCategoryChart(categoryBreakdown(subs)));
    chartsCol.appendChild(catCard);

    const trendCard = document.createElement('div'); trendCard.className = 'card';
    const trendTitle = document.createElement('div'); trendTitle.className = 'card-title'; trendTitle.textContent = 'Monthly Trend';
    trendCard.appendChild(trendTitle);
    trendCard.appendChild(renderSparkline(sparklineData(subs)));
    chartsCol.appendChild(trendCard);
  }

  // Right column
  const rightCol = document.getElementById('right-col');
  if (rightCol) {
    rightCol.innerHTML = '';

    // Branded identity card at top of right column
    const brandCard = document.createElement('div');
    brandCard.className = 'card brand-card';
    brandCard.innerHTML = `
      <div class="brand-card-logo">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="20" cy="20" r="19" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <rect x="11" y="21" width="3" height="8" rx="0.5" fill="currentColor"/>
          <rect x="16" y="21" width="3" height="8" rx="0.5" fill="currentColor"/>
          <rect x="21" y="21" width="3" height="8" rx="0.5" fill="currentColor"/>
          <rect x="26" y="21" width="3" height="8" rx="0.5" fill="currentColor"/>
          <rect x="10" y="30" width="20" height="2" rx="0.5" fill="currentColor"/>
          <polygon points="20,10 30,19 10,19" fill="currentColor"/>
        </svg>
      </div>
      <div class="brand-card-text">
        <div class="brand-card-name">SUB-SITE</div>
        <div class="brand-card-sub">Subscription Tracker</div>
      </div>
      <div class="brand-card-tagline">Track · Analyse · Save</div>
    `;
    rightCol.appendChild(brandCard);

    // Upcoming renewals card
    const renewCard = document.createElement('div'); renewCard.className = 'card';
    const renewTitle = document.createElement('div'); renewTitle.className = 'card-title'; renewTitle.textContent = 'Upcoming Renewals';
    renewCard.appendChild(renewTitle);
    const renewals = upcomingRenewals(subs, 30).slice(0, 5);
    if (renewals.length === 0) {
      const none = document.createElement('div'); none.style.color = '#64748b'; none.style.fontSize = '13px'; none.textContent = 'No renewals in the next 30 days.';
      renewCard.appendChild(none);
    } else {
      renewals.forEach(r => {
        const item = document.createElement('div'); item.className = 'renewal-item';
        const info = document.createElement('div');
        const name = document.createElement('div'); name.className = 'renewal-name'; name.textContent = r.name;
        const date = document.createElement('div'); date.className = 'renewal-date'; date.textContent = _formatDate(r.nextBillingDate);
        info.appendChild(name); info.appendChild(date);
        const badge = document.createElement('div');
        badge.className = 'renewal-badge' + (r.daysUntil <= 7 ? ' soon' : '');
        badge.textContent = r.daysUntil === 0 ? 'Today' : `${r.daysUntil} day${r.daysUntil !== 1 ? 's' : ''}`;
        item.appendChild(info); item.appendChild(badge);
        renewCard.appendChild(item);
      });
    }
    rightCol.appendChild(renewCard);

    // Possible savings card
    const savCard = document.createElement('div'); savCard.className = 'card';
    const savTitle = document.createElement('div'); savTitle.className = 'card-title'; savTitle.textContent = '💡 Possible Savings';
    savCard.appendChild(savTitle);
    const activeSorted = subs.filter(s => s.status === 'Active').sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
    let found = null;
    for (const s of activeSorted) {
      const key = s.name.trim().toLowerCase();
      if (typeof KNOWN_SERVICES !== 'undefined' && KNOWN_SERVICES[key]) { found = { sub: s, data: KNOWN_SERVICES[key] }; break; }
    }
    if (found) {
      const { sub: matchSub, data } = found;
      const body = document.createElement('div'); body.className = 'savings-body';
      const costSpan = document.createElement('strong'); costSpan.className = 'savings-amount';
      costSpan.textContent = _currencySymbol(matchSub.currency) + parseFloat(matchSub.cost).toFixed(2) + '/mo';
      body.appendChild(document.createTextNode('You\'re paying '));
      body.appendChild(costSpan);
      body.appendChild(document.createTextNode(' for ' + matchSub.name + '. '));
      const altLink = document.createElement('a');
      altLink.href = '#';
      altLink.textContent = data.alt;
      altLink.addEventListener('click', (e) => { e.preventDefault(); navigate('alternatives'); });
      body.appendChild(altLink);
      body.appendChild(document.createTextNode(' could save you ' + data.saving + '.'));
      const affNote = document.createElement('div'); affNote.style.marginTop = '8px'; affNote.style.fontSize = '11px'; affNote.style.color = '#475569'; affNote.textContent = 'Affiliate link · See Alternatives for more';
      body.appendChild(affNote);
      savCard.appendChild(body);
    } else {
      const none = document.createElement('div'); none.style.color = '#64748b'; none.style.fontSize = '13px'; none.textContent = 'No alternatives found for your current subscriptions.';
      savCard.appendChild(none);
    }
    rightCol.appendChild(savCard);
  }
}
function renderModal(sub) {
  const modal = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  if (!modal) return;

  const isEdit = sub !== null && sub !== undefined;
  const settings = getSettings();
  const defaultCurrency = settings.defaultCurrency || 'GBP';

  modal.innerHTML = '';

  // Title
  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = isEdit ? 'Edit Subscription' : 'Add Subscription';

  const sub2 = document.createElement('div');
  sub2.className = 'modal-sub';
  sub2.textContent = 'All fields marked * are required. Data stays on your device.';

  // Form grid
  const grid = document.createElement('div');
  grid.className = 'form-grid';

  function makeField(label, inputEl, full) {
    const group = document.createElement('div');
    group.className = 'form-group' + (full ? ' full' : '');
    const lbl = document.createElement('label');
    lbl.className = 'form-label';
    lbl.textContent = label;
    group.appendChild(lbl);
    group.appendChild(inputEl);
    return group;
  }

  function makeSelect(options, value) {
    const sel = document.createElement('select');
    sel.className = 'form-input';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === value) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }

  // Name — wrapped in a relative container for the autocomplete dropdown
  const nameWrapper = document.createElement('div');
  nameWrapper.className = 'autocomplete-wrapper';

  const nameInput = document.createElement('input');
  nameInput.className = 'form-input';
  nameInput.type = 'text';
  nameInput.autocomplete = 'off';
  nameInput.placeholder = 'e.g. Netflix, Spotify, Adobe CC…';
  if (isEdit) nameInput.value = sub.name;

  const acDropdown = document.createElement('div');
  acDropdown.className = 'autocomplete-dropdown';
  acDropdown.style.display = 'none';

  nameWrapper.appendChild(nameInput);
  nameWrapper.appendChild(acDropdown);

  // ── Autocomplete helpers ──────────────────────────────────────────────────

  function toTitleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  let acActiveIndex = -1;

  function acHide() {
    acDropdown.style.display = 'none';
    acDropdown.innerHTML = '';
    acActiveIndex = -1;
  }

  function acSelect(key) {
    nameInput.value = toTitleCase(key);
    if (KNOWN_SERVICE_CATEGORIES && KNOWN_SERVICE_CATEGORIES[key]) {
      catSelect.value = KNOWN_SERVICE_CATEGORIES[key];
    }
    acHide();
  }

  function acShow(query) {
    const q = query.toLowerCase();
    const keys = Object.keys(KNOWN_SERVICES);
    const matches = keys.filter(k => k.includes(q)).slice(0, 8);

    if (matches.length === 0) { acHide(); return; }

    acDropdown.innerHTML = '';
    acActiveIndex = -1;

    matches.forEach((key, idx) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = toTitleCase(key);
      item.dataset.key = key;
      item.addEventListener('mousedown', (e) => {
        // mousedown fires before blur; prevent blur from hiding the dropdown first
        e.preventDefault();
        acSelect(key);
      });
      item.addEventListener('mouseover', () => {
        acActiveIndex = idx;
        acUpdateHighlight();
      });
      acDropdown.appendChild(item);
    });

    acDropdown.style.display = 'block';
  }

  function acUpdateHighlight() {
    const items = acDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, i) => {
      item.classList.toggle('autocomplete-item--active', i === acActiveIndex);
    });
  }

  // Input event — filter and show
  nameInput.addEventListener('input', () => {
    const q = nameInput.value.trim();
    if (q.length === 0) { acHide(); return; }
    acShow(q);
  });

  // Keyboard navigation
  nameInput.addEventListener('keydown', (e) => {
    if (acDropdown.style.display === 'none') return;
    const items = acDropdown.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1);
      acUpdateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acActiveIndex = Math.max(acActiveIndex - 1, 0);
      acUpdateHighlight();
    } else if (e.key === 'Enter') {
      if (acActiveIndex >= 0 && items[acActiveIndex]) {
        e.preventDefault();
        acSelect(items[acActiveIndex].dataset.key);
      }
    } else if (e.key === 'Escape') {
      acHide();
    }
  });

  // Dismiss on outside click
  document.addEventListener('click', function acOutsideClick(e) {
    if (!nameWrapper.contains(e.target)) {
      acHide();
      document.removeEventListener('click', acOutsideClick);
    }
  });

  grid.appendChild(makeField('Service Name *', nameWrapper, true));

  // Category
  const catSelect = makeSelect(CATEGORIES, isEdit ? sub.category : CATEGORIES[0]);
  grid.appendChild(makeField('Category *', catSelect, false));

  // Status
  const statusSelect = makeSelect(STATUSES, isEdit ? sub.status : 'Active');
  grid.appendChild(makeField('Status', statusSelect, false));

  // Cost
  const costInput = document.createElement('input');
  costInput.className = 'form-input';
  costInput.type = 'number';
  costInput.step = '0.01';
  costInput.min = '0';
  costInput.placeholder = '0.00';
  if (isEdit) costInput.value = sub.cost;
  grid.appendChild(makeField('Cost *', costInput, false));

  // Currency
  const currSelect = makeSelect(CURRENCIES, isEdit ? sub.currency : defaultCurrency);
  grid.appendChild(makeField('Currency', currSelect, false));

  // Billing Cycle
  const cycleSelect = makeSelect(BILLING_CYCLES, isEdit ? sub.billingCycle : 'Monthly');
  grid.appendChild(makeField('Billing Cycle', cycleSelect, false));

  // Next Billing Date
  const dateInput = document.createElement('input');
  dateInput.className = 'form-input';
  dateInput.type = 'date';
  if (isEdit && sub.nextBillingDate) dateInput.value = sub.nextBillingDate;
  grid.appendChild(makeField('Next Billing Date', dateInput, false));

  // Notes
  const notesInput = document.createElement('input');
  notesInput.className = 'form-input';
  notesInput.type = 'text';
  notesInput.placeholder = 'e.g. shared with family, trial ends soon…';
  if (isEdit && sub.notes) notesInput.value = sub.notes;
  grid.appendChild(makeField('Notes (optional)', notesInput, true));

  // Error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.style.display = 'none';

  // Actions
  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', closeModal);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-save';
  saveBtn.textContent = isEdit ? 'Save Changes' : 'Save Subscription';
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const cost = parseFloat(costInput.value);
    if (!name) {
      errorDiv.textContent = 'Service name is required.';
      errorDiv.style.display = 'block';
      return;
    }
    if (isNaN(cost) || cost < 0) {
      errorDiv.textContent = 'Please enter a valid cost (0 or more).';
      errorDiv.style.display = 'block';
      return;
    }
    const updated = {
      ...(isEdit ? sub : {}),
      name,
      category: catSelect.value,
      status: statusSelect.value,
      cost,
      currency: currSelect.value,
      billingCycle: cycleSelect.value,
      nextBillingDate: dateInput.value || null,
      notes: notesInput.value.trim(),
      starred: isEdit ? sub.starred : false,
    };
    saveSubscription(updated);
    closeModal();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  modal.appendChild(title);
  modal.appendChild(sub2);
  modal.appendChild(grid);
  modal.appendChild(errorDiv);
  modal.appendChild(actions);

  // Close on backdrop click
  if (!overlay._modalBackdropBound) {
    overlay._modalBackdropBound = true;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Focus name field
  setTimeout(() => nameInput.focus(), 50);
}
function renderAlternatives(subs) {
  const container = document.getElementById('alternatives-container');
  if (!container) return;
  container.innerHTML = '';

  const activeSubs = subs.filter(s => s.status === 'Active');

  if (activeSubs.length === 0) {
    container.appendChild(_emptyState('Add some subscriptions to see money-saving alternatives.'));
    return;
  }

  // Disclosure
  const disc = document.createElement('div');
  disc.className = 'disclosure';
  disc.textContent = 'Sub-Site may earn a small commission if you sign up via these links, at no extra cost to you. Suggestions are based on your actual subscriptions.';
  container.appendChild(disc);

  // Tier 1: known service matches
  // Find matches — deduplicate by KNOWN_SERVICES key (keep highest-spend per key)
  const matchMap = new Map(); // key -> sub with highest monthly
  activeSubs.forEach(sub => {
    const key = sub.name.trim().toLowerCase();
    if (KNOWN_SERVICES[key]) {
      const existing = matchMap.get(key);
      if (!existing || monthlyEquivalent(sub) > monthlyEquivalent(existing)) {
        matchMap.set(key, sub);
      }
    }
  });

  // Sort by monthly spend descending
  const tier1 = [...matchMap.entries()].sort((a, b) => monthlyEquivalent(b[1]) - monthlyEquivalent(a[1]));
  // Track which categories have tier1 matches
  const matchedCategories = new Set(tier1.map(([, sub]) => sub.category));

  if (tier1.length > 0) {
    const tier1Label = document.createElement('div');
    tier1Label.className = 'affiliate-tier-label';
    tier1Label.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M2 5h10M9 2l3 3-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11H4M7 8l-3 3 3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Matched to your subscriptions';
    container.appendChild(tier1Label);

    const grid1 = document.createElement('div');
    grid1.className = 'affiliate-grid';

    tier1.forEach(([key, sub]) => {
      const data = KNOWN_SERVICES[key];
      const card = document.createElement('div');
      card.className = 'affiliate-card';

      const cardTitle = document.createElement('div');
      cardTitle.className = 'affiliate-card-title';
      cardTitle.textContent = sub.name + ' \u2192 ' + data.alt;

      const cardSub = document.createElement('div');
      cardSub.className = 'affiliate-card-sub';
      cardSub.textContent = 'You\'re paying ' + _formatCost(sub) + '/' + _formatCycle(sub.billingCycle);

      const saving = document.createElement('div');
      saving.className = 'affiliate-saving';
      saving.textContent = 'Save ' + data.saving;

      const cta = document.createElement('div');
      cta.className = 'affiliate-cta';
      const btn = document.createElement('a');
      btn.className = 'affiliate-btn';
      btn.href = data.url;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = 'Switch & Save';
      const note = document.createElement('span');
      note.className = 'affiliate-link-note';
      note.textContent = 'Affiliate link';
      cta.appendChild(btn);
      cta.appendChild(note);

      card.appendChild(cardTitle);
      card.appendChild(cardSub);
      card.appendChild(saving);
      card.appendChild(cta);
      grid1.appendChild(card);
    });

    container.appendChild(grid1);
  }

  // Tier 2: category fallbacks for unmatched categories
  const activeCategories = [...new Set(activeSubs.map(s => s.category))];
  const tier2Categories = activeCategories.filter(cat => !matchedCategories.has(cat) && CATEGORY_FALLBACKS[cat]);

  if (tier2Categories.length > 0) {
    const tier2Label = document.createElement('div');
    tier2Label.className = 'affiliate-tier-label';
    tier2Label.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M8 2a4 4 0 0 1 2 7.46V11H6V9.46A4 4 0 0 1 8 2z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M6 12h4M6.5 13.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>General category suggestions';
    container.appendChild(tier2Label);

    const grid2 = document.createElement('div');
    grid2.className = 'affiliate-grid';

    tier2Categories.forEach(cat => {
      const data = CATEGORY_FALLBACKS[cat];
      const card = document.createElement('div');
      card.className = 'affiliate-card';

      const cardTitle = document.createElement('div');
      cardTitle.className = 'affiliate-card-title';
      cardTitle.textContent = cat + ' alternative';

      const cardSub = document.createElement('div');
      cardSub.className = 'affiliate-card-sub';
      cardSub.textContent = data.alt;

      const cta = document.createElement('div');
      cta.className = 'affiliate-cta';
      const btn = document.createElement('a');
      btn.className = 'affiliate-btn';
      btn.href = data.url;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = 'Learn More';
      const note = document.createElement('span');
      note.className = 'affiliate-link-note';
      note.textContent = 'Affiliate link';
      cta.appendChild(btn);
      cta.appendChild(note);

      card.appendChild(cardTitle);
      card.appendChild(cardSub);
      card.appendChild(cta);
      grid2.appendChild(card);
    });

    container.appendChild(grid2);
  }
}
function renderExport() {
  const container = document.getElementById('export-container');
  if (!container) return;
  container.innerHTML = '';

  // Section 1: Export JSON
  const jsonSection = document.createElement('div');
  jsonSection.className = 'export-section';
  const jsonTitle = document.createElement('div'); jsonTitle.className = 'export-section-title'; jsonTitle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M8 5v4M6 7l2 2 2-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>Export as JSON';
  const jsonDesc = document.createElement('div'); jsonDesc.className = 'export-section-desc'; jsonDesc.textContent = 'Download a full backup of all your data, including settings. Use this to move your data to another device.';
  const jsonBtnRow = document.createElement('div'); jsonBtnRow.className = 'export-btn-row';
  const jsonBtn = document.createElement('button'); jsonBtn.className = 'export-btn'; jsonBtn.textContent = '⤓ Export JSON';
  jsonBtn.addEventListener('click', exportJSON);
  jsonBtnRow.appendChild(jsonBtn);
  const jsonPrivacy = document.createElement('div'); jsonPrivacy.className = 'export-privacy'; jsonPrivacy.textContent = 'Your backup file stays on your device. We never see it.';
  jsonSection.appendChild(jsonTitle); jsonSection.appendChild(jsonDesc); jsonSection.appendChild(jsonBtnRow); jsonSection.appendChild(jsonPrivacy);
  container.appendChild(jsonSection);

  // Section 2: Export CSV
  const csvSection = document.createElement('div');
  csvSection.className = 'export-section';
  const csvTitle = document.createElement('div'); csvTitle.className = 'export-section-title'; csvTitle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M1 7h14M6 3v10" stroke="currentColor" stroke-width="1.2" opacity="0.5"/></svg>Export as CSV';
  const csvDesc = document.createElement('div'); csvDesc.className = 'export-section-desc'; csvDesc.textContent = 'Download your subscriptions as a spreadsheet. Useful for analysis in Excel or Google Sheets.';
  const csvBtnRow = document.createElement('div'); csvBtnRow.className = 'export-btn-row';
  const csvBtn = document.createElement('button'); csvBtn.className = 'export-btn'; csvBtn.textContent = '⤓ Export CSV';
  csvBtn.addEventListener('click', exportCSV);
  csvBtnRow.appendChild(csvBtn);
  csvSection.appendChild(csvTitle); csvSection.appendChild(csvDesc); csvSection.appendChild(csvBtnRow);
  container.appendChild(csvSection);

  // Section 3: Import JSON
  const importSection = document.createElement('div');
  importSection.className = 'export-section';
  const impTitle = document.createElement('div'); impTitle.className = 'export-section-title'; impTitle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M8 10V4M6 6l2-2 2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="12" width="12" height="2" rx="1" fill="currentColor" opacity="0.4"/></svg>Import Data';
  const impDesc = document.createElement('div'); impDesc.className = 'export-section-desc'; impDesc.textContent = 'Restore from a backup file. Choose whether to merge with or replace your existing data.';

  // Mode radio buttons
  const modeRow = document.createElement('div'); modeRow.className = 'import-mode-row';
  function makeRadio(value, labelText, checked) {
    const lbl = document.createElement('label'); lbl.className = 'import-mode-label';
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'importMode'; radio.value = value;
    if (checked) radio.checked = true;
    lbl.appendChild(radio);
    lbl.appendChild(document.createTextNode(labelText));
    return lbl;
  }
  modeRow.appendChild(makeRadio('merge', 'Merge (keep existing, add new)', true));
  modeRow.appendChild(makeRadio('replace', 'Replace (overwrite all)', false));

  // Result message element
  const resultDiv = document.createElement('div'); resultDiv.className = 'import-result'; resultDiv.style.display = 'none';

  // Hidden file input
  const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.json'; fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const selectedRadio = importSection.querySelector('input[name="importMode"]:checked');
      const mode = selectedRadio ? selectedRadio.value : 'merge';
      const result = importJSON(e.target.result, mode);
      resultDiv.style.display = 'block';
      if (result.ok) {
        resultDiv.className = 'import-result success';
        resultDiv.textContent = `✓ Imported ${result.imported} subscription${result.imported !== 1 ? 's' : ''}. ${result.skipped} ${result.skipped !== 1 ? 'entries were' : 'entry was'} skipped (already exist or invalid).`;
      } else {
        resultDiv.className = 'import-result error';
        resultDiv.textContent = result.error;
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // File picker button
  const impBtnRow = document.createElement('div'); impBtnRow.className = 'export-btn-row';
  const impBtn = document.createElement('button'); impBtn.className = 'export-btn'; impBtn.textContent = '📂 Choose backup file…';
  impBtn.addEventListener('click', () => fileInput.click());
  impBtnRow.appendChild(impBtn);

  importSection.appendChild(impTitle);
  importSection.appendChild(impDesc);
  importSection.appendChild(modeRow);
  importSection.appendChild(impBtnRow);
  importSection.appendChild(fileInput);
  importSection.appendChild(resultDiv);
  container.appendChild(importSection);
}
function renderSettings(settings) {
  const container = document.getElementById('settings-container');
  if (!container) return;
  container.innerHTML = '';

  function makeSection(extraClass) {
    const s = document.createElement('div');
    s.className = 'export-section' + (extraClass ? ' ' + extraClass : '');
    return s;
  }
  function makeTitle(text) {
    const t = document.createElement('div'); t.className = 'export-section-title'; t.textContent = text; return t;
  }
  function makeDesc(text) {
    const d = document.createElement('div'); d.className = 'export-section-desc'; d.textContent = text; return d;
  }

  // Section 1: Default Currency
  const currSection = makeSection('');
  const currTitle = makeTitle('');
  currTitle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v1.5M8 9.5V11M6.5 6.5a1.5 1.5 0 0 1 3 0c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Default Currency';
  currSection.appendChild(currTitle);
  currSection.appendChild(makeDesc('Pre-fills the currency field when adding a new subscription.'));

  const currField = document.createElement('div'); currField.className = 'settings-field';
  const currLbl = document.createElement('label'); currLbl.className = 'settings-label'; currLbl.textContent = 'Currency';
  const currSel = document.createElement('select'); currSel.className = 'settings-select';
  CURRENCIES.forEach(c => {
    const opt = document.createElement('option'); opt.value = c; opt.textContent = c;
    if (c === settings.defaultCurrency) opt.selected = true;
    currSel.appendChild(opt);
  });
  currField.appendChild(currLbl); currField.appendChild(currSel);

  const currSaveBtn = document.createElement('button'); currSaveBtn.className = 'settings-save-btn'; currSaveBtn.textContent = 'Save';
  currSaveBtn.addEventListener('click', () => {
    saveSettings({ defaultCurrency: currSel.value });
    _showToast('Currency saved');
  });

  currSection.appendChild(currField);
  currSection.appendChild(currSaveBtn);
  container.appendChild(currSection);

  // Section 2: Waste Alert Threshold
  const threshSection = makeSection('');
  const threshTitle = makeTitle('');
  threshTitle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M2 12l3-4 3 2 3-5 3-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="4" r="2" fill="currentColor" opacity="0.4"/></svg>Waste Alert Threshold';
  threshSection.appendChild(threshTitle);
  threshSection.appendChild(makeDesc('Show the waste alert on the dashboard when annual spend exceeds this amount (in your default currency).'));

  const threshField = document.createElement('div'); threshField.className = 'settings-field';
  const threshLbl = document.createElement('label'); threshLbl.className = 'settings-label'; threshLbl.textContent = 'Annual threshold';
  const threshInput = document.createElement('input');
  threshInput.className = 'settings-input'; threshInput.type = 'number'; threshInput.min = '0'; threshInput.step = '1';
  threshInput.value = String(settings.wasteAlertThreshold ?? 1500);
  threshField.appendChild(threshLbl); threshField.appendChild(threshInput);

  const threshSaveBtn = document.createElement('button'); threshSaveBtn.className = 'settings-save-btn'; threshSaveBtn.textContent = 'Save';
  threshSaveBtn.addEventListener('click', () => {
    const val = Number(threshInput.value);
    if (!isNaN(val) && val >= 0) {
      saveSettings({ wasteAlertThreshold: val });
      _showToast('Threshold saved');
    } else {
      _showToast('Enter a valid number', 'error');
    }
  });

  threshSection.appendChild(threshField);
  threshSection.appendChild(threshSaveBtn);
  container.appendChild(threshSection);

  // Section 3: Danger Zone
  const dangerSection = makeSection('danger-zone');
  const dangerTitle = makeTitle('');
  dangerTitle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><path d="M8 2L2 13h12L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/><path d="M8 6v3M8 11v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Danger Zone';
  dangerSection.appendChild(dangerTitle);
  dangerSection.appendChild(makeDesc('Permanently delete all subscription data and settings. This cannot be undone.'));

  const clearBtn = document.createElement('button'); clearBtn.className = 'danger-btn'; clearBtn.textContent = 'Clear All Data';
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure? This will permanently delete all your data and cannot be undone.')) {
      clearAllData();
      navigate('dashboard');
    }
  });
  dangerSection.appendChild(clearBtn);
  container.appendChild(dangerSection);
}
