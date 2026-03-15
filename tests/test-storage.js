// tests/test-storage.js

// --- Settings ---
test('getSettings returns defaults when nothing stored', () => {
  localStorage.clear();
  const s = getSettings();
  assertEquals(s.defaultCurrency, 'GBP');
  assertEquals(s.wasteAlertThreshold, 1500);
});

test('saveSettings merges with defaults', () => {
  localStorage.clear();
  saveSettings({ defaultCurrency: 'USD' });
  const s = getSettings();
  assertEquals(s.defaultCurrency, 'USD');
  assertEquals(s.wasteAlertThreshold, 1500);
});

test('isBannerDismissed returns false by default', () => {
  localStorage.clear();
  assertEquals(isBannerDismissed(), false);
});

test('dismissBanner persists across getSettings call', () => {
  localStorage.clear();
  dismissBanner();
  assertEquals(isBannerDismissed(), true);
});

// --- Subscriptions ---
test('getAllSubscriptions returns empty array when nothing stored', () => {
  localStorage.clear();
  assertEquals(getAllSubscriptions(), []);
});

test('saveSubscription adds new sub with generated id', () => {
  localStorage.clear();
  const sub = saveSubscription({
    name: 'Netflix', category: 'Streaming', cost: 17.99,
    currency: 'GBP', billingCycle: 'Monthly', status: 'Active',
    starred: false, notes: ''
  });
  assert(sub.id, 'should have id');
  assertEquals(getAllSubscriptions().length, 1);
});

test('saveSubscription updates existing sub by id', () => {
  localStorage.clear();
  const sub = saveSubscription({ name: 'Netflix', cost: 17.99, status: 'Active',
    category: 'Streaming', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' });
  saveSubscription({ ...sub, cost: 20.99 });
  const all = getAllSubscriptions();
  assertEquals(all.length, 1);
  assertEquals(all[0].cost, 20.99);
});

test('deleteSubscription removes sub by id', () => {
  localStorage.clear();
  const sub = saveSubscription({ name: 'Spotify', cost: 10.99, status: 'Active',
    category: 'Music', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' });
  deleteSubscription(sub.id);
  assertEquals(getAllSubscriptions().length, 0);
});

// monthlyEquivalent
test('monthlyEquivalent: Monthly returns cost as-is', () => {
  assertClose(monthlyEquivalent({ cost: 10, billingCycle: 'Monthly', status: 'Active' }), 10);
});
test('monthlyEquivalent: Weekly = cost * 52 / 12', () => {
  assertClose(monthlyEquivalent({ cost: 10, billingCycle: 'Weekly', status: 'Active' }), 43.333);
});
test('monthlyEquivalent: Quarterly = cost / 3', () => {
  assertClose(monthlyEquivalent({ cost: 30, billingCycle: 'Quarterly', status: 'Active' }), 10);
});
test('monthlyEquivalent: Annually = cost / 12', () => {
  assertClose(monthlyEquivalent({ cost: 120, billingCycle: 'Annually', status: 'Active' }), 10);
});
test('monthlyEquivalent: Paused sub returns 0', () => {
  assertEquals(monthlyEquivalent({ cost: 10, billingCycle: 'Monthly', status: 'Paused' }), 0);
});

// isMultiCurrency
test('isMultiCurrency: false when all same currency', () => {
  const subs = [
    { status: 'Active', currency: 'GBP', cost: 10, billingCycle: 'Monthly' },
    { status: 'Active', currency: 'GBP', cost: 5,  billingCycle: 'Monthly' }
  ];
  assertEquals(isMultiCurrency(subs), false);
});
test('isMultiCurrency: true when mixed', () => {
  const subs = [
    { status: 'Active', currency: 'GBP', cost: 10, billingCycle: 'Monthly' },
    { status: 'Active', currency: 'USD', cost: 5,  billingCycle: 'Monthly' }
  ];
  assertEquals(isMultiCurrency(subs), true);
});

// totalMonthlySpend
test('totalMonthlySpend: sums only active subs', () => {
  const subs = [
    { status: 'Active', currency: 'GBP', cost: 10, billingCycle: 'Monthly' },
    { status: 'Paused', currency: 'GBP', cost: 20, billingCycle: 'Monthly' }
  ];
  assertClose(totalMonthlySpend(subs), 10);
});

// categoryBreakdown
test('categoryBreakdown: groups by category', () => {
  const subs = [
    { status: 'Active', category: 'Streaming', cost: 10, billingCycle: 'Monthly', currency: 'GBP' },
    { status: 'Active', category: 'Streaming', cost: 5,  billingCycle: 'Monthly', currency: 'GBP' },
    { status: 'Active', category: 'Music',     cost: 8,  billingCycle: 'Monthly', currency: 'GBP' }
  ];
  const bd = categoryBreakdown(subs);
  assertClose(bd['Streaming'], 15);
  assertClose(bd['Music'], 8);
});

// upcomingRenewals
test('upcomingRenewals: returns subs due within 30 days', () => {
  const soon = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const far  = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const subs = [
    { status: 'Active', nextBillingDate: soon, name: 'A', cost: 10, billingCycle: 'Monthly', currency: 'GBP', category: 'Streaming', starred: false, notes: '' },
    { status: 'Active', nextBillingDate: far,  name: 'B', cost: 5,  billingCycle: 'Monthly', currency: 'GBP', category: 'Music',     starred: false, notes: '' }
  ];
  const renewals = upcomingRenewals(subs);
  assertEquals(renewals.length, 1);
  assertEquals(renewals[0].name, 'A');
  assert(renewals[0].daysUntil <= 6);
});

// sparklineData
test('sparklineData: returns 6 entries', () => {
  assertEquals(sparklineData([]).length, 6);
});

test('sparklineData: monthly sub contributes to all 6 months', () => {
  // nextBillingDate far in future so all months pass diff >= 0
  const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const subs = [{ status: 'Active', cost: 10, billingCycle: 'Monthly',
    currency: 'GBP', nextBillingDate: future, category: 'Streaming' }];
  const data = sparklineData(subs);
  data.forEach(d => assertClose(d.total, 10));
});

test('sparklineData: sub without nextBillingDate excluded', () => {
  const subs = [{ status: 'Active', cost: 10, billingCycle: 'Monthly',
    currency: 'GBP', nextBillingDate: null, category: 'Streaming' }];
  const data = sparklineData(subs);
  data.forEach(d => assertEquals(d.total, 0));
});

test('sparklineData: last entry is current month', () => {
  const now = new Date();
  const label = now.toLocaleString('default', { month: 'short' });
  const data = sparklineData([]);
  assertEquals(data[5].label, label);
  assertEquals(data[5].isCurrent, true);
});

// --- importJSON ---
test('importJSON: rejects invalid JSON', () => {
  const result = importJSON('not json', 'replace');
  assertEquals(result.ok, false);
  assert(result.error.includes('parse'), result.error);
});

test('importJSON: rejects file with no subscriptions array', () => {
  const result = importJSON(JSON.stringify({ foo: 'bar' }), 'replace');
  assertEquals(result.ok, false);
});

test('importJSON replace: replaces all subs', () => {
  localStorage.clear();
  saveSubscription({ name: 'Old', cost: 5, status: 'Active',
    category: 'Other', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' });
  const newSubs = [{ id: 'abc', name: 'New', cost: 10, status: 'Active',
    category: 'Streaming', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' }];
  const result = importJSON(JSON.stringify({ subsight_subscriptions: newSubs }), 'replace');
  assertEquals(result.ok, true);
  assertEquals(getAllSubscriptions().length, 1);
  assertEquals(getAllSubscriptions()[0].name, 'New');
});

test('importJSON merge: appends new ids, skips existing', () => {
  localStorage.clear();
  const existing = saveSubscription({ name: 'Existing', cost: 5, status: 'Active',
    category: 'Other', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' });
  const incoming = [
    { ...existing, cost: 999 },                  // same id — should be skipped
    { id: 'newid', name: 'New', cost: 10, status: 'Active',
      category: 'Streaming', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' }
  ];
  const result = importJSON(JSON.stringify({ subsight_subscriptions: incoming }), 'merge');
  assertEquals(result.ok, true);
  assertEquals(getAllSubscriptions().length, 2);
  // existing unchanged
  assertEquals(getAllSubscriptions().find(s => s.id === existing.id).cost, 5);
});

test('importJSON: skips invalid individual entries, reports count', () => {
  localStorage.clear();
  const data = {
    subsight_subscriptions: [
      { id: 'a', name: 'Valid', cost: 10, status: 'Active',
        category: 'Streaming', currency: 'GBP', billingCycle: 'Monthly', starred: false, notes: '' },
      { id: 'b' } // missing required fields
    ]
  };
  const result = importJSON(JSON.stringify(data), 'replace');
  assertEquals(result.ok, true);
  assertEquals(getAllSubscriptions().length, 1);
  assertEquals(result.skipped, 1);
});
