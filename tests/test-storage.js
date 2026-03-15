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
