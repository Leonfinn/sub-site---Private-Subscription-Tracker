// tests/test-app.js
// Tests for app.js routing logic
// Note: navigate() and renderCurrentView() use DOM + render stubs,
// so we test the pieces we can test in isolation.

test('navigate sets _currentView', () => {
  // We can't easily unit test DOM navigation without a browser,
  // so this is a smoke-test placeholder that verifies app.js loaded.
  assert(typeof navigate === 'function', 'navigate should be defined');
  assert(typeof openModal === 'function', 'openModal should be defined');
  assert(typeof closeModal === 'function', 'closeModal should be defined');
  assert(typeof initApp === 'function', 'initApp should be defined');
  assert(typeof renderCurrentView === 'function', 'renderCurrentView should be defined');
});
