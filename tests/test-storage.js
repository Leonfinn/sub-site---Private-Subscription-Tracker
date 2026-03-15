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
