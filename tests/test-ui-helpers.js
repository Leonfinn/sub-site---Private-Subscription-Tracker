// tests/test-ui-helpers.js

test('_currencySymbol GBP', () => assertEquals(_currencySymbol('GBP'), '£'));
test('_currencySymbol USD', () => assertEquals(_currencySymbol('USD'), '$'));
test('_currencySymbol EUR', () => assertEquals(_currencySymbol('EUR'), '€'));
test('_currencySymbol unknown falls back to code', () => assertEquals(_currencySymbol('XYZ'), 'XYZ'));

test('_formatCost monthly subscription', () => {
  assertEquals(_formatCost({ currency: 'GBP', cost: 17.99 }), '£17.99');
});

test('_formatCost USD with cents', () => {
  assertEquals(_formatCost({ currency: 'USD', cost: 9.9 }), '$9.90');
});

test('_formatCycle Monthly', () => assertEquals(_formatCycle('Monthly'), 'monthly'));
test('_formatCycle Quarterly', () => assertEquals(_formatCycle('Quarterly'), 'quarterly'));
test('_formatCycle Annually', () => assertEquals(_formatCycle('Annually'), 'annually'));
test('_formatCycle Weekly', () => assertEquals(_formatCycle('Weekly'), 'weekly'));

test('_formatDate empty returns dash', () => assertEquals(_formatDate(''), '—'));
test('_formatDate null returns dash', () => assertEquals(_formatDate(null), '—'));
test('_formatDate valid date', () => {
  // 2026-04-01 should format to something containing '1', 'Apr', '2026'
  const result = _formatDate('2026-04-01');
  assert(result.includes('2026'), 'should include year');
  assert(result.toLowerCase().includes('apr'), 'should include month');
});

test('_emptyState creates div with message', () => {
  const el = _emptyState('Nothing here');
  assertEquals(el.tagName, 'DIV', 'should be div');
  assertEquals(el.className, 'empty-state', 'should have class');
  assertEquals(el.textContent, 'Nothing here', 'should have message');
});
