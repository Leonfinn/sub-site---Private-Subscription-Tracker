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

// Resolve the correct recommendation data for a subscription, accounting for plan tiers.
// For flat entries (no tiers), returns the entry unchanged.
// For tiered entries, matches against the full plan monthly cost (un-splitting splitWays)
// so a user paying their share of a family plan still matches the family tier.
function resolveServiceData(key, sub) {
  const entry = KNOWN_SERVICES[key];
  if (!entry || !entry.tiers) return entry;
  const fullMonthly = monthlyEquivalent(sub) * (sub.splitWays > 1 ? sub.splitWays : 1);
  for (const tier of entry.tiers) {
    if (fullMonthly <= tier.maxMonthly) return tier;
  }
  return entry.tiers[entry.tiers.length - 1];
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
    const wishlist  = subs.filter(s => s.status === 'Wishlist').length;
    const parts = [`${active} active`, `${paused} paused`, `${cancelled} cancelled`];
    if (wishlist) parts.push(`${wishlist} wishlist`);
    summary.textContent = parts.join(' · ');
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
    if (sub.status === 'Wishlist') tr.className = 'sub-row--wishlist';

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
    const fullCost = _formatCost(sub);
    if (sub.splitWays && sub.splitWays > 1) {
      const share = (parseFloat(sub.cost) / sub.splitWays);
      costDiv.textContent = _currencySymbol(sub.currency) + share.toFixed(2);
      const splitBadge = document.createElement('span');
      splitBadge.className = 'split-badge';
      splitBadge.title = `Full plan: ${fullCost} ÷ ${sub.splitWays} people`;
      splitBadge.textContent = `÷${sub.splitWays}`;
      costDiv.appendChild(splitBadge);
    } else {
      costDiv.textContent = fullCost;
    }
    const cycleDiv = document.createElement('div');
    cycleDiv.className = 'cycle';
    cycleDiv.textContent = _formatCycle(sub.billingCycle);
    costTd.appendChild(costDiv);
    costTd.appendChild(cycleDiv);

    // Annual savings nudge (Monthly Active only)
    const _nudgeKey = (sub.name || '').toLowerCase().trim();
    const _nudgeSuppressed = KNOWN_SERVICES[_nudgeKey] && KNOWN_SERVICES[_nudgeKey].noAnnualNudge;
    if (!_nudgeSuppressed && sub.status === 'Active' && sub.billingCycle === 'Monthly') {
      const cost = parseFloat(sub.cost) || 0;
      const saving = cost * 12 * 0.175;
      if (saving >= 1) {
        const nudge = document.createElement('div');
        nudge.className = 'savings-nudge';
        nudge.title = 'Switch to annual billing to save this amount';
        nudge.textContent = `💡 Save ~${_currencySymbol(sub.currency)}${saving.toFixed(0)}/yr`;
        nudge.addEventListener('click', (e) => { e.stopPropagation(); _showAnnualSavingsModal(sub); });
        costTd.appendChild(nudge);
      }
    }

    // Renewal cell
    const renewTd = document.createElement('td');
    renewTd.style.color = '#64748b';
    renewTd.style.fontSize = '13px';
    renewTd.textContent = _formatDate(sub.nextBillingDate);

    // Status cell
    const statusTd = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge ' + sub.status.toLowerCase();
    statusBadge.textContent = sub.status === 'Wishlist' ? '🗂 Wishlist' : sub.status;
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
  // Beta banner
  const betaBannerEl = document.getElementById('trust-banner');
  if (betaBannerEl && !document.getElementById('beta-banner')) {
    const betaBanner = document.createElement('div');
    betaBanner.id = 'beta-banner';
    betaBanner.className = 'beta-banner';
    betaBanner.innerHTML = '🚧 <strong>Beta:</strong> This is an early version of Sub-Site. Some features are still in development — alternative subscription suggestions are not working yet. Your feedback is welcome. <a href="feedback.html" class="beta-feedback-link">Leave feedback →</a>';
    betaBannerEl.parentElement.insertBefore(betaBanner, betaBannerEl);
  }

  // Date subtitle
  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Add button
  const dashAddBtn = document.getElementById('dashAddBtn');
  if (dashAddBtn && !dashAddBtn._bound) { dashAddBtn._bound = true; dashAddBtn.addEventListener('click', () => openModal(null)); }

  // Import button
  const dashImportBtn = document.getElementById('dashImportBtn');
  if (dashImportBtn && !dashImportBtn._bound) { dashImportBtn._bound = true; dashImportBtn.addEventListener('click', () => showImportModal()); }

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

  // Audit banner
  const auditBannerEl = document.getElementById('audit-banner');
  if (auditBannerEl) {
    auditBannerEl.innerHTML = '';
    const auditTs = localStorage.getItem(KEYS.AUDIT_TS);
    const daysSinceAudit = auditTs ? Math.floor((Date.now() - parseInt(auditTs, 10)) / 86400000) : null;
    const activeSubs = subs.filter(s => s.status === 'Active');
    if (activeSubs.length > 0 && (auditTs === null || daysSinceAudit >= 90)) {
      const banner = document.createElement('div');
      banner.className = 'audit-banner';
      const txt = auditTs
        ? `⏰ Time for your quarterly subscription review — last audit was ${daysSinceAudit} days ago.`
        : '⏰ Ready for your first subscription audit? Review each subscription and cut what you don\'t need.';
      const textSpan = document.createElement('span');
      textSpan.textContent = txt;
      const startBtn = document.createElement('button');
      startBtn.className = 'audit-banner-btn';
      startBtn.textContent = 'Start Audit';
      startBtn.addEventListener('click', () => showAuditModal());
      banner.appendChild(textSpan);
      banner.appendChild(startBtn);
      auditBannerEl.appendChild(banner);
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

    // Potential annual savings from switching monthly → annual
    if (!multiCurr) {
      const monthlySubs = activeSubs.filter(s => s.billingCycle === 'Monthly');
      if (monthlySubs.length > 0) {
        const potSaving = monthlySubs.reduce((sum, s) => sum + (parseFloat(s.cost) || 0) * 12 * 0.175, 0);
        if (potSaving >= 1) {
          statsRow.appendChild(makeStatCard('Potential Savings', sym + potSaving.toFixed(0) + '/yr', 'stat-savings', 'switching monthly → annual'));
        }
      }
    }
  }

  // Charts column
  const chartsCol = document.getElementById('charts-col');
  if (chartsCol) {
    chartsCol.innerHTML = '';

    // Hero feature panels — only shown when no subscriptions yet
    if (subs.filter(s => s.status === 'Active').length === 0) {
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
      if (typeof KNOWN_SERVICES !== 'undefined' && KNOWN_SERVICES[key]) { found = { sub: s, data: resolveServiceData(key, s) }; break; }
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
  nameInput.setAttribute('autocomplete', 'new-password');
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
    // Pre-fill cost from serviceCost (the service's own price for this tier/variant).
    // For tiered entries use the first tier's serviceCost as a hint.
    // For flat variant entries use their serviceCost directly.
    // The price field on all entries is the alternative's price — never use it here.
    if (!isEdit && costInput && KNOWN_SERVICES[key]) {
      const entry = KNOWN_SERVICES[key];
      const priceStr = entry.tiers ? entry.tiers[0].serviceCost : entry.serviceCost;
      if (priceStr) {
        const match = priceStr.match(/[\d.]+/);
        if (match && !costInput.value) costInput.value = match[0];
      }
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

  // Shared plan (splitWays)
  const splitRow = document.createElement('div');
  splitRow.className = 'form-group full split-row';
  const splitCheck = document.createElement('input');
  splitCheck.type = 'checkbox';
  splitCheck.id = 'splitShared';
  splitCheck.className = 'split-checkbox';
  if (isEdit && sub.splitWays && sub.splitWays > 1) splitCheck.checked = true;
  const splitLbl = document.createElement('label');
  splitLbl.htmlFor = 'splitShared';
  splitLbl.className = 'split-label';
  splitLbl.textContent = 'Shared plan — split cost between people';
  const splitWrap = document.createElement('div');
  splitWrap.className = 'split-wrap';
  splitWrap.appendChild(splitCheck);
  splitWrap.appendChild(splitLbl);
  const splitDetail = document.createElement('div');
  splitDetail.className = 'split-detail';
  splitDetail.style.display = splitCheck.checked ? 'flex' : 'none';
  const splitNum = document.createElement('input');
  splitNum.type = 'number';
  splitNum.className = 'form-input split-num';
  splitNum.min = '2';
  splitNum.max = '20';
  splitNum.placeholder = '2';
  splitNum.value = (isEdit && sub.splitWays && sub.splitWays > 1) ? sub.splitWays : '2';
  const splitHint = document.createElement('span');
  splitHint.className = 'split-hint';
  splitDetail.appendChild(document.createTextNode('Split between '));
  splitDetail.appendChild(splitNum);
  splitDetail.appendChild(document.createTextNode(' people'));
  splitRow.appendChild(splitWrap);
  splitRow.appendChild(splitDetail);
  splitCheck.addEventListener('change', () => {
    splitDetail.style.display = splitCheck.checked ? 'flex' : 'none';
  });
  grid.appendChild(splitRow);

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
    const splitWays = splitCheck.checked ? Math.max(2, parseInt(splitNum.value, 10) || 2) : undefined;
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
      ...(splitWays ? { splitWays } : { splitWays: undefined }),
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
// ── Import from Email modal ───────────────────────────────

function autoCategory(name) {
  if (!name) return CATEGORIES[0];
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Try exact key match first
  if (KNOWN_SERVICE_CATEGORIES && KNOWN_SERVICE_CATEGORIES[key]) return KNOWN_SERVICE_CATEGORIES[key];
  // Try prefix match
  if (KNOWN_SERVICE_CATEGORIES) {
    const found = Object.keys(KNOWN_SERVICE_CATEGORIES).find(k => key.includes(k) || k.includes(key));
    if (found) return KNOWN_SERVICE_CATEGORIES[found];
  }
  return CATEGORIES[0];
}

function showImportModal() {
  const modal   = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  if (!modal) return;

  modal.innerHTML = '';

  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = 'Import from Email';

  const subEl = document.createElement('div');
  subEl.className = 'modal-sub';
  subEl.textContent = 'Paste a renewal email or drop a .eml file — all parsing is 100% on-device.';

  // Drop / paste zone
  const dropZone = document.createElement('div');
  dropZone.className = 'import-area';

  const hint = document.createElement('div');
  hint.className = 'import-hint';
  hint.innerHTML = '<span class="import-icon">📧</span> Drop a <strong>.eml</strong> file here, or paste below';

  const textarea = document.createElement('textarea');
  textarea.className = 'import-textarea form-input';
  textarea.placeholder = 'Paste the text of your renewal email here…';
  textarea.rows = 6;

  dropZone.appendChild(hint);
  dropZone.appendChild(textarea);

  // Button row
  const btnRow = document.createElement('div');
  btnRow.className = 'import-btn-row';

  const clipBtn = document.createElement('button');
  clipBtn.type = 'button';
  clipBtn.className = 'btn-clip';
  clipBtn.textContent = '📋 Read Clipboard';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.eml,message/rfc822';
  fileInput.style.display = 'none';

  const fileBtn = document.createElement('button');
  fileBtn.type = 'button';
  fileBtn.className = 'btn-clip';
  fileBtn.textContent = '📁 Choose File';

  btnRow.appendChild(clipBtn);
  btnRow.appendChild(fileBtn);

  // Preview section
  const preview = document.createElement('div');
  preview.className = 'import-preview';
  preview.style.display = 'none';

  // Actions
  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', closeModal);

  const continueBtn = document.createElement('button');
  continueBtn.className = 'btn-save';
  continueBtn.textContent = 'Continue →';
  continueBtn.disabled = true;

  actions.appendChild(cancelBtn);
  actions.appendChild(continueBtn);

  // How it works — collapsible guide (Gemini-authored content)
  const howTo = document.createElement('details');
  howTo.className = 'import-howto';
  const howToSum = document.createElement('summary');
  howToSum.className = 'import-howto-summary';
  howToSum.textContent = '? How does this work?';
  howTo.appendChild(howToSum);
  const howToBody = document.createElement('div');
  howToBody.className = 'import-howto-body';
  howToBody.innerHTML = `
    <ol class="import-steps">
      <li><strong>Find your receipt</strong> — open the renewal or "upcoming charge" email for the service you want to add (Netflix, Spotify, your gym, etc.).</li>
      <li><strong>Copy the text</strong> — select and copy the entire body of the email. Or save it as a <code>.eml</code> file and drag it into this panel.</li>
      <li><strong>Paste it here</strong> — paste into the box above. The app reads your clipboard automatically if you've allowed it.</li>
      <li><strong>Review the preview</strong> — the parser shows what it found: price, currency, billing cycle, and next date.</li>
      <li><strong>Fill any gaps</strong> — fields highlighted in amber weren't found in the email. You'll fill those in on the next screen.</li>
      <li><strong>Click Continue</strong> — the Add Subscription form opens pre-filled. Check the details and save.</li>
    </ol>
    <p class="import-howto-tips"><strong>Tips:</strong> Copy the whole email for best results. Some providers (like mobile carriers) don't include a price in their renewal emails — just enter it manually. Check that the next billing date shown is for your <em>next</em> payment, not the last one.</p>
    <p class="import-howto-privacy">🔒 <strong>Privacy:</strong> Your email text is processed entirely inside your browser. Nothing is ever sent to a server — not even a character.</p>
  `;
  howTo.appendChild(howToBody);

  modal.appendChild(titleEl);
  modal.appendChild(subEl);
  modal.appendChild(dropZone);
  modal.appendChild(btnRow);
  modal.appendChild(fileInput);
  modal.appendChild(preview);
  modal.appendChild(howTo);
  modal.appendChild(actions);

  overlay.classList.remove('hidden');

  // ── State ────────────────────────────────────────────────
  let parsedResult = null;

  function runParse(text, subject, from) {
    if (!text || text.trim().length < 15) {
      preview.style.display = 'none';
      continueBtn.disabled = true;
      parsedResult = null;
      return;
    }
    parsedResult = EMAIL_PARSER.parse(text, subject, from);
    renderPreview(parsedResult);
    continueBtn.disabled = false;
  }

  function renderPreview(p) {
    preview.innerHTML = '';
    preview.style.display = 'block';

    // Confidence bar
    const confRow = document.createElement('div');
    confRow.className = 'import-conf-row';
    const confLabel = document.createElement('span');
    confLabel.className = 'import-conf-label';
    confLabel.textContent = 'Match confidence';
    const confBar = document.createElement('div');
    confBar.className = 'import-conf-bar';
    const confFill = document.createElement('div');
    confFill.className = 'import-conf-fill';
    const pct = Math.round(p.confidence);
    confFill.style.width = pct + '%';
    confFill.classList.add(pct >= 60 ? 'conf-high' : pct >= 30 ? 'conf-mid' : 'conf-low');
    confBar.appendChild(confFill);
    const confNum = document.createElement('span');
    confNum.className = 'import-conf-num';
    confNum.textContent = pct + '%';
    confRow.appendChild(confLabel);
    confRow.appendChild(confBar);
    confRow.appendChild(confNum);
    preview.appendChild(confRow);

    // Fields grid
    const grid = document.createElement('div');
    grid.className = 'import-fields';
    function addField(label, value, missing) {
      const cell = document.createElement('div');
      cell.className = 'import-field' + (missing ? ' import-field--missing' : '');
      const lbl = document.createElement('div');
      lbl.className = 'import-field-label';
      lbl.textContent = label;
      const val = document.createElement('div');
      val.className = 'import-field-value';
      val.textContent = value || '—';
      cell.appendChild(lbl);
      cell.appendChild(val);
      grid.appendChild(cell);
    }
    addField('Service', p.name, !p.name);
    addField('Cost', p.cost !== null ? p.cost.toFixed(2) : null, p.cost === null);
    addField('Currency', p.currency, !p.currency);
    addField('Billing', p.billingCycle, !p.billingCycle);
    addField('Next date', p.nextBillingDate, !p.nextBillingDate);
    preview.appendChild(grid);

    if (p.partial) {
      const warn = document.createElement('div');
      warn.className = 'import-partial-hint';
      warn.textContent = '⚠ Cost not found — you\'ll be able to enter it on the next screen.';
      preview.appendChild(warn);
    }
  }

  // ── Clipboard ────────────────────────────────────────────
  clipBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 10) {
        textarea.value = text;
        runParse(text, '', '');
      } else {
        _showToast('Clipboard is empty', 'error');
      }
    } catch (_) {
      _showToast('Clipboard access denied — paste manually', 'error');
    }
  });

  // ── File picker ──────────────────────────────────────────
  fileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) readEmlFile(fileInput.files[0]);
  });

  // ── Drag-and-drop ────────────────────────────────────────
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('import-area--dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('import-area--dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('import-area--dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.eml') || file.type === 'message/rfc822')) {
      readEmlFile(file);
    } else {
      _showToast('Drop a .eml file', 'error');
    }
  });

  function readEmlFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = EMAIL_PARSER.parseEml(ev.target.result);
      if (data) {
        textarea.value = data.body.slice(0, 3000);
        runParse(data.body, data.subject, data.from);
      } else {
        _showToast('Could not read .eml file — try pasting the text instead', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  // ── Textarea live parse ───────────────────────────────────
  let parseTimer = null;
  textarea.addEventListener('input', () => {
    clearTimeout(parseTimer);
    parseTimer = setTimeout(() => runParse(textarea.value, '', ''), 450);
  });

  // ── Continue ─────────────────────────────────────────────
  continueBtn.addEventListener('click', () => {
    if (!parsedResult) return;
    const prefill = {
      name:            parsedResult.name || '',
      cost:            parsedResult.cost,
      currency:        parsedResult.currency || 'GBP',
      billingCycle:    parsedResult.billingCycle || 'Monthly',
      nextBillingDate: parsedResult.nextBillingDate || null,
      category:        autoCategory(parsedResult.name),
      status:          'Active',
      notes:           '',
    };
    closeModal();
    openModal(prefill);
  });

  // ── Backdrop ─────────────────────────────────────────────
  if (!overlay._modalBackdropBound) {
    overlay._modalBackdropBound = true;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Auto-read clipboard silently on open
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(text => {
      if (text && text.trim().length > 50 && !textarea.value) {
        textarea.value = text;
        runParse(text, '', '');
      }
    }).catch(() => {});
  }

  setTimeout(() => textarea.focus(), 50);
}

// ── Annual Savings Calculator ─────────────────────────────

function _showAnnualSavingsModal(sub) {
  const modal   = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  if (!modal) return;
  modal.innerHTML = '';

  const cost    = parseFloat(sub.cost) || 0;
  const sym     = _currencySymbol(sub.currency);
  const annualFull = cost * 12;
  const saving  = annualFull * 0.175;
  const annualPrice = annualFull - saving;

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = 'Switch to Annual Billing';

  const sub2 = document.createElement('div');
  sub2.className = 'modal-sub';
  sub2.textContent = `${sub.name} — estimate based on typical 15–20% annual discount`;

  const table = document.createElement('div');
  table.className = 'savings-table';
  function row(label, val, cls) {
    const r = document.createElement('div');
    r.className = 'savings-row' + (cls ? ' ' + cls : '');
    r.innerHTML = `<span>${label}</span><strong>${val}</strong>`;
    return r;
  }
  table.appendChild(row('Current cost (monthly)',   `${sym}${cost.toFixed(2)}/mo`));
  table.appendChild(row('Current cost (annual)',    `${sym}${annualFull.toFixed(2)}/yr`));
  table.appendChild(row('Estimated annual price',  `${sym}${annualPrice.toFixed(2)}/yr`, 'savings-row--annual'));
  table.appendChild(row('Your estimated saving',   `${sym}${saving.toFixed(2)}/yr`, 'savings-row--saving'));

  const hint = document.createElement('p');
  hint.className = 'savings-hint';
  hint.textContent = 'Actual annual price varies by provider. Check their website before switching.';

  const costInput = document.createElement('input');
  costInput.className = 'form-input';
  costInput.type = 'number';
  costInput.step = '0.01';
  costInput.value = annualPrice.toFixed(2);
  const costGroup = document.createElement('div');
  costGroup.className = 'form-group';
  const costLbl = document.createElement('label');
  costLbl.className = 'form-label';
  costLbl.textContent = 'Confirm annual cost (edit if you know the exact price)';
  costGroup.appendChild(costLbl);
  costGroup.appendChild(costInput);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Keep Monthly';
  cancelBtn.addEventListener('click', closeModal);
  const convertBtn = document.createElement('button');
  convertBtn.className = 'btn-save';
  convertBtn.textContent = 'Convert to Annual';
  convertBtn.addEventListener('click', () => {
    const newCost = parseFloat(costInput.value);
    if (isNaN(newCost) || newCost <= 0) return;
    saveSubscription({ ...sub, billingCycle: 'Annually', cost: newCost });
    closeModal();
    _showToast(`${sub.name} converted to annual billing`, 'success');
  });
  actions.appendChild(cancelBtn);
  actions.appendChild(convertBtn);

  modal.appendChild(title);
  modal.appendChild(sub2);
  modal.appendChild(table);
  modal.appendChild(hint);
  modal.appendChild(costGroup);
  modal.appendChild(actions);
  overlay.classList.remove('hidden');

  if (!overlay._modalBackdropBound) {
    overlay._modalBackdropBound = true;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }
}

// ── Quarterly Audit Mode ──────────────────────────────────

function showAuditModal() {
  const subs   = getAllSubscriptions().filter(s => s.status === 'Active');
  const modal  = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  if (!modal || subs.length === 0) return;

  let idx = 0;
  const changes = [];

  function renderStep() {
    modal.innerHTML = '';
    if (idx >= subs.length) { renderSummary(); return; }
    const sub = subs[idx];

    const progress = document.createElement('div');
    progress.className = 'audit-progress';
    progress.textContent = `Reviewing ${idx + 1} of ${subs.length}`;

    const bar = document.createElement('div');
    bar.className = 'audit-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'audit-progress-fill';
    fill.style.width = ((idx / subs.length) * 100) + '%';
    bar.appendChild(fill);

    const nameEl = document.createElement('div');
    nameEl.className = 'audit-sub-name';
    nameEl.textContent = sub.name;

    const meta = document.createElement('div');
    meta.className = 'audit-sub-meta';
    const cost = parseFloat(sub.cost) || 0;
    const sym = _currencySymbol(sub.currency);
    const monthly = monthlyEquivalent(sub);
    meta.textContent = `${sym}${cost.toFixed(2)} ${_formatCycle(sub.billingCycle)} · ${sub.category}`;
    if (sub.billingCycle !== 'Monthly') {
      meta.textContent += ` (${sym}${monthly.toFixed(2)}/mo)`;
    }

    const actions = document.createElement('div');
    actions.className = 'audit-actions';

    function makeBtn(label, cls, action) {
      const btn = document.createElement('button');
      btn.className = 'audit-btn ' + cls;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (action !== 'keep') {
          changes.push({ sub, action });
          saveSubscription({ ...sub, status: action === 'wishlist' ? 'Wishlist' : action === 'pause' ? 'Paused' : 'Cancelled' });
        }
        idx++;
        renderStep();
      });
      return btn;
    }
    actions.appendChild(makeBtn('✓ Keep', 'audit-btn--keep', 'keep'));
    actions.appendChild(makeBtn('⏸ Pause', 'audit-btn--pause', 'pause'));
    actions.appendChild(makeBtn('✕ Cancel', 'audit-btn--cancel', 'cancel'));
    actions.appendChild(makeBtn('🗂 Wishlist', 'audit-btn--wishlist', 'wishlist'));

    const skipLink = document.createElement('button');
    skipLink.className = 'audit-skip';
    skipLink.textContent = 'Stop audit for now';
    skipLink.addEventListener('click', closeModal);

    modal.appendChild(progress);
    modal.appendChild(bar);
    modal.appendChild(nameEl);
    modal.appendChild(meta);
    modal.appendChild(actions);
    modal.appendChild(skipLink);
  }

  function renderSummary() {
    // Stamp audit date
    try { localStorage.setItem(KEYS.AUDIT_TS, Date.now().toString()); } catch (_) {}

    modal.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '✓ Audit Complete';

    const paused    = changes.filter(c => c.action === 'pause').length;
    const cancelled = changes.filter(c => c.action === 'cancel').length;
    const wishlisted = changes.filter(c => c.action === 'wishlist').length;

    // Calculate savings from changes
    const allSubs = getAllSubscriptions();
    const savedMonthly = changes
      .filter(c => c.action === 'cancel' || c.action === 'pause')
      .reduce((sum, c) => sum + (parseFloat(c.sub.cost) / (c.sub.billingCycle === 'Annually' ? 12 : c.sub.billingCycle === 'Quarterly' ? 3 : 1)), 0);
    const savedAnnual = savedMonthly * 12;

    const stats = document.createElement('div');
    stats.className = 'audit-summary-stats';
    stats.innerHTML = `
      <div class="audit-stat"><span class="audit-stat-n">${subs.length}</span><span>reviewed</span></div>
      ${paused ? `<div class="audit-stat"><span class="audit-stat-n">${paused}</span><span>paused</span></div>` : ''}
      ${cancelled ? `<div class="audit-stat"><span class="audit-stat-n">${cancelled}</span><span>cancelled</span></div>` : ''}
      ${wishlisted ? `<div class="audit-stat"><span class="audit-stat-n">${wishlisted}</span><span>wishlisted</span></div>` : ''}
    `;

    const savingsEl = document.createElement('div');
    savingsEl.className = 'audit-savings';
    if (savedAnnual > 0) {
      const firstSub = changes.find(c => c.action === 'cancel' || c.action === 'pause');
      const sym = firstSub ? _currencySymbol(firstSub.sub.currency) : '£';
      savingsEl.textContent = `Potential saving: ${sym}${savedAnnual.toFixed(0)}/yr`;
      savingsEl.classList.add('audit-savings--positive');
    } else {
      savingsEl.textContent = 'No changes made — all subscriptions kept.';
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-save';
    closeBtn.style.width = '100%';
    closeBtn.textContent = 'Done';
    closeBtn.addEventListener('click', () => {
      closeModal();
      // Refresh the dashboard audit banner
      document.dispatchEvent(new CustomEvent('subsight:updated', { detail: {} }));
    });

    modal.appendChild(title);
    modal.appendChild(stats);
    modal.appendChild(savingsEl);
    modal.appendChild(closeBtn);
  }

  renderStep();
  overlay.classList.remove('hidden');

  if (!overlay._modalBackdropBound) {
    overlay._modalBackdropBound = true;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }
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
  const allPlaceholders = Object.values(KNOWN_SERVICES).every(v =>
    v.tiers ? v.tiers.every(t => t.url === 'AFFILIATE_URL') : v.url === 'AFFILIATE_URL'
  );
  disc.textContent = allPlaceholders
    ? 'These are direct links to each service\'s pricing page. Sub-Site has no affiliate relationship with these services.'
    : 'Sub-Site may earn a small commission if you sign up via these links, at no extra cost to you. Suggestions are based on your actual subscriptions.';
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
      const data = resolveServiceData(key, sub);
      const card = document.createElement('div');
      card.className = 'affiliate-card';

      const cardTitle = document.createElement('div');
      cardTitle.className = 'affiliate-card-title';
      cardTitle.textContent = sub.name + (data.label ? ' (' + data.label + ')' : '') + ' \u2192 ' + data.alt;

      const cardSub = document.createElement('div');
      cardSub.className = 'affiliate-card-sub';
      cardSub.textContent = 'You\'re paying ' + _formatCost(sub) + '/' + _formatCycle(sub.billingCycle);

      const saving = document.createElement('div');
      saving.className = 'affiliate-saving';
      saving.textContent = data.price ? data.price : 'Save ' + data.saving;

      const cta = document.createElement('div');
      cta.className = 'affiliate-cta';
      if (data.homepage) {
        const btn = document.createElement('a');
        btn.className = 'affiliate-btn';
        btn.href = data.homepage;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.textContent = 'Visit';
        const note = document.createElement('span');
        note.className = 'affiliate-link-note';
        note.textContent = data.url === 'AFFILIATE_URL' ? 'Direct link, not affiliated' : 'Affiliate link';
        cta.appendChild(btn);
        cta.appendChild(note);
      }

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
      if (data.homepage) {
        const btn = document.createElement('a');
        btn.className = 'affiliate-btn';
        btn.href = data.homepage;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.textContent = 'Learn More';
        const note = document.createElement('span');
        note.className = 'affiliate-link-note';
        note.textContent = data.url === 'AFFILIATE_URL' ? 'Direct link, not affiliated' : 'Affiliate link';
        cta.appendChild(btn);
        cta.appendChild(note);
      }

      card.appendChild(cardTitle);
      card.appendChild(cardSub);
      card.appendChild(cta);
      grid2.appendChild(card);
    });

    container.appendChild(grid2);
  }

  // Tier 3: unmatched subs with no useful category fallback — show targeted search card
  const tier1Keys = new Set(tier1.map(([key]) => key));
  const unmatchedSubs = activeSubs.filter(sub => {
    const key = sub.name.trim().toLowerCase();
    if (tier1Keys.has(key)) return false;           // already in Tier 1
    if (CATEGORY_FALLBACKS[sub.category]) return false; // has a Tier 2 category fallback
    return true;
  });

  // Deduplicate by normalised name
  const seenNames = new Set();
  const tier3Subs = unmatchedSubs.filter(sub => {
    const key = sub.name.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  if (tier3Subs.length > 0) {
    const tier3Label = document.createElement('div');
    tier3Label.className = 'affiliate-tier-label';
    tier3Label.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>Not in our database yet';
    container.appendChild(tier3Label);

    const grid3 = document.createElement('div');
    grid3.className = 'affiliate-grid';

    tier3Subs.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'affiliate-card affiliate-card--unmatched';

      const cardTitle = document.createElement('div');
      cardTitle.className = 'affiliate-card-title';
      cardTitle.textContent = sub.name;

      const cardSub = document.createElement('div');
      cardSub.className = 'affiliate-card-sub';
      cardSub.textContent = 'We don\'t have a specific recommendation for this one yet.';

      const cta = document.createElement('div');
      cta.className = 'affiliate-cta affiliate-cta--unmatched';

      const searchBtn = document.createElement('a');
      searchBtn.className = 'affiliate-btn';
      searchBtn.href = 'https://alternativeto.net/?q=' + encodeURIComponent(sub.name);
      searchBtn.target = '_blank';
      searchBtn.rel = 'noopener noreferrer';
      searchBtn.textContent = 'Find alternatives \u2197';

      const suggestLink = document.createElement('a');
      suggestLink.className = 'affiliate-suggest-link';
      suggestLink.href = 'feedback.html?suggest=' + encodeURIComponent(sub.name);
      suggestLink.textContent = 'Suggest this service \u2192';

      cta.appendChild(searchBtn);
      cta.appendChild(suggestLink);
      card.appendChild(cardTitle);
      card.appendChild(cardSub);
      card.appendChild(cta);
      grid3.appendChild(card);
    });

    container.appendChild(grid3);
  }
}
function renderExport() {
  const container = document.getElementById('export-container');
  if (!container) return;
  container.innerHTML = '';

  // ── Section 1: Save a backup (JSON) ─────────────────────
  const jsonSection = document.createElement('div');
  jsonSection.className = 'export-section';

  const jsonHeading = document.createElement('div');
  jsonHeading.className = 'export-section-heading';
  jsonHeading.innerHTML = `
    <div class="export-section-title">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/>
        <path d="M8 5v4M6 7l2 2 2-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>Save a backup
    </div>
    <div class="export-format-label">.json file — for restoring your data</div>
  `;

  const jsonDesc = document.createElement('div');
  jsonDesc.className = 'export-section-desc';
  jsonDesc.innerHTML = 'Your subscriptions are only saved in this browser, on this device — there is no automatic backup anywhere else. They will be lost if you:' +
    '<ul class="export-loss-list">' +
    '<li>Clear your browser history or cache</li>' +
    '<li>Switch to a different browser or device</li>' +
    '<li>Use private / incognito mode</li>' +
    '</ul>' +
    'Downloading a backup is the only way to protect your data.';

  const jsonBtnRow = document.createElement('div');
  jsonBtnRow.className = 'export-btn-row';
  const jsonBtn = document.createElement('button');
  jsonBtn.className = 'export-btn';
  jsonBtn.textContent = '⬇ Download Backup (.json)';
  jsonBtn.addEventListener('click', exportJSON);
  jsonBtnRow.appendChild(jsonBtn);

  const jsonPrivacy = document.createElement('div');
  jsonPrivacy.className = 'export-privacy';
  jsonPrivacy.textContent = 'Your backup file stays on your device. We never see it.';

  const cloudTip = document.createElement('div');
  cloudTip.className = 'export-tip';
  cloudTip.innerHTML = `
    <strong>💡 Tip: Save your backup somewhere safe</strong>
    <span>After downloading, move the file to Google Drive, iCloud, Dropbox, or OneDrive. This lets you restore your data on any device. Sub-Site does not sync automatically — this is a manual step.</span>
  `;

  jsonSection.appendChild(jsonHeading);
  jsonSection.appendChild(jsonDesc);
  jsonSection.appendChild(jsonBtnRow);
  jsonSection.appendChild(jsonPrivacy);
  jsonSection.appendChild(cloudTip);
  container.appendChild(jsonSection);

  // ── Section 2: Export to spreadsheet (CSV) ──────────────
  const csvSection = document.createElement('div');
  csvSection.className = 'export-section';

  const csvHeading = document.createElement('div');
  csvHeading.className = 'export-section-heading';
  csvHeading.innerHTML = `
    <div class="export-section-title">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px">
        <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
        <path d="M1 7h14M6 3v10" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
      </svg>Export to a spreadsheet
    </div>
    <div class="export-format-label">.csv file — for Excel, Google Sheets, Numbers</div>
  `;

  const csvDesc = document.createElement('div');
  csvDesc.className = 'export-section-desc';
  csvDesc.textContent = 'Downloads a simple list of your subscriptions — one row per subscription. Useful for reviewing or charting your spending. Note: this file cannot be used to restore your data in Sub-Site.';

  const csvBtnRow = document.createElement('div');
  csvBtnRow.className = 'export-btn-row';
  const csvBtn = document.createElement('button');
  csvBtn.className = 'export-btn';
  csvBtn.textContent = '⬇ Download Spreadsheet (.csv)';
  csvBtn.addEventListener('click', exportCSV);
  csvBtnRow.appendChild(csvBtn);

  csvSection.appendChild(csvHeading);
  csvSection.appendChild(csvDesc);
  csvSection.appendChild(csvBtnRow);
  container.appendChild(csvSection);

  // ── Section 3: Restore from a backup ───────────────────
  const importSection = document.createElement('div');
  importSection.className = 'export-section';

  const impHeading = document.createElement('div');
  impHeading.className = 'export-section-heading';
  impHeading.innerHTML = `
    <div class="export-section-title">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="vertical-align:-2px;margin-right:6px">
        <path d="M8 10V4M6 6l2-2 2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="2" y="12" width="12" height="2" rx="1" fill="currentColor" opacity="0.4"/>
      </svg>Restore from a backup
    </div>
  `;

  const impDesc = document.createElement('div');
  impDesc.className = 'export-section-desc';
  impDesc.textContent = 'Upload a backup file to bring your subscriptions back. Only .json backup files exported from Sub-Site can be imported.';

  // Radio buttons
  const modeRow = document.createElement('div');
  modeRow.className = 'import-mode-row';

  function makeRadio(value, labelText, helperText, helperClass, checked) {
    const wrap = document.createElement('label');
    wrap.className = 'import-mode-label';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'importMode';
    radio.value = value;
    if (checked) radio.checked = true;
    const lbl = document.createElement('span');
    lbl.textContent = labelText;
    const helper = document.createElement('div');
    helper.className = 'import-mode-helper' + (helperClass ? ' ' + helperClass : '');
    helper.textContent = helperText;
    wrap.appendChild(radio);
    wrap.appendChild(lbl);
    wrap.appendChild(helper);
    return wrap;
  }

  modeRow.appendChild(makeRadio(
    'merge',
    'Add to my current list',
    'Your existing subscriptions stay. New ones from the backup are added alongside them.',
    '',
    true
  ));
  modeRow.appendChild(makeRadio(
    'replace',
    'Replace everything',
    '⚠ All your current subscriptions will be permanently deleted and replaced. This cannot be undone.',
    'import-mode-helper-warn',
    false
  ));

  // Warning shown when Replace is selected
  const replaceWarn = document.createElement('div');
  replaceWarn.className = 'import-replace-warning';
  replaceWarn.style.display = 'none';
  replaceWarn.textContent = 'Warning: clicking the button below will immediately and permanently delete all your current data.';

  // Wire radio change to show/hide warning
  modeRow.querySelectorAll('input[name="importMode"]').forEach(r => {
    r.addEventListener('change', () => {
      replaceWarn.style.display = r.value === 'replace' && r.checked ? 'block' : 'none';
    });
  });

  // Result message
  const resultDiv = document.createElement('div');
  resultDiv.className = 'import-result';
  resultDiv.style.display = 'none';

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const selectedRadio = importSection.querySelector('input[name="importMode"]:checked');
    const mode = selectedRadio ? selectedRadio.value : 'merge';

    // Confirmation for replace mode
    if (mode === 'replace') {
      const confirmed = confirm('This will permanently delete all your current subscriptions and replace them with the ones in the backup file. This cannot be undone.\n\nAre you sure?');
      if (!confirmed) { fileInput.value = ''; return; }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = importJSON(e.target.result, mode);
      resultDiv.style.display = 'block';
      if (result.ok) {
        resultDiv.className = 'import-result success';
        const lines = [
          `✓ Added:   ${result.added} subscription${result.added !== 1 ? 's' : ''}`,
          `~ Skipped: ${result.dupeSkipped} already on your dashboard`,
        ];
        if (result.invalid > 0) lines.push(`✗ Invalid: ${result.invalid} record${result.invalid !== 1 ? 's' : ''} couldn't be read`);
        resultDiv.textContent = lines.join('\n');
      } else {
        resultDiv.className = 'import-result error';
        resultDiv.textContent = result.error || 'Could not read the file. Make sure you are using a .json backup file exported from Sub-Site.';
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // File picker button
  const impBtnRow = document.createElement('div');
  impBtnRow.className = 'export-btn-row';
  const impBtn = document.createElement('button');
  impBtn.className = 'export-btn';
  impBtn.textContent = '📂 Choose backup file…';
  impBtn.addEventListener('click', () => fileInput.click());
  impBtnRow.appendChild(impBtn);
  impBtnRow.appendChild(fileInput);

  importSection.appendChild(impHeading);
  importSection.appendChild(impDesc);
  importSection.appendChild(modeRow);
  importSection.appendChild(replaceWarn);
  importSection.appendChild(impBtnRow);
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
