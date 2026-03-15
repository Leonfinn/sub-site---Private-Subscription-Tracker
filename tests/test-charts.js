// tests/test-charts.js

test('renderCategoryChart empty returns p element', () => {
  const el = renderCategoryChart({});
  assertEquals(el.tagName, 'P', 'should return a <p> element');
});

test('renderCategoryChart single category renders bar', () => {
  const el = renderCategoryChart({ 'Streaming': 62.5 });
  assertEquals(el.className, 'bar-chart', 'should be bar-chart div');
  assertEquals(el.querySelectorAll('.bar-row').length, 1, 'should have 1 row');
  assert(el.innerHTML.includes('£62.50'), 'should show formatted amount');
});

test('renderCategoryChart sorts descending', () => {
  const el = renderCategoryChart({ 'Music': 10, 'Streaming': 50, 'Gaming': 30 });
  const labels = [...el.querySelectorAll('.bar-label')].map(l => l.textContent);
  assertEquals(labels[0], 'Streaming', 'highest first');
  assertEquals(labels[1], 'Gaming', 'second');
  assertEquals(labels[2], 'Music', 'lowest last');
});

test('renderCategoryChart filters zero amounts', () => {
  const el = renderCategoryChart({ 'Streaming': 50, 'Gaming': 0 });
  assertEquals(el.querySelectorAll('.bar-row').length, 1, 'should only show non-zero');
});

test('renderSparkline returns sparkline div with 6 columns', () => {
  const months = [
    { label: 'Oct', total: 100, isCurrent: false },
    { label: 'Nov', total: 120, isCurrent: false },
    { label: 'Dec', total: 130, isCurrent: false },
    { label: 'Jan', total: 140, isCurrent: false },
    { label: 'Feb', total: 150, isCurrent: false },
    { label: 'Mar', total: 200, isCurrent: true },
  ];
  const el = renderSparkline(months);
  assertEquals(el.className, 'sparkline', 'should be sparkline div');
  assertEquals(el.querySelectorAll('.spark-col').length, 6, 'should have 6 columns');
});

test('renderSparkline current month gets current class', () => {
  const months = [
    { label: 'Oct', total: 100, isCurrent: false },
    { label: 'Nov', total: 120, isCurrent: false },
    { label: 'Dec', total: 130, isCurrent: false },
    { label: 'Jan', total: 140, isCurrent: false },
    { label: 'Feb', total: 150, isCurrent: false },
    { label: 'Mar', total: 200, isCurrent: true },
  ];
  const el = renderSparkline(months);
  const bars = el.querySelectorAll('.spark-bar');
  assert(bars[5].classList.contains('current'), 'last bar should be current');
  assert(!bars[0].classList.contains('current'), 'first bar should not be current');
});

test('renderSparkline all zero totals renders without error', () => {
  const months = Array.from({ length: 6 }, (_, i) => ({ label: 'M' + i, total: 0, isCurrent: i === 5 }));
  const el = renderSparkline(months);
  assertEquals(el.querySelectorAll('.spark-col').length, 6, 'should still render 6 columns');
});
