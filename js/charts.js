// js/charts.js

const CATEGORY_COLORS = {
  'Streaming':       '#38bdf8',
  'Software / SaaS': '#818cf8',
  'Cloud Storage':   '#34d399',
  'Gaming':          '#f59e0b',
  'Music':           '#f472b6',
  'News / Media':    '#fb923c',
  'Health & Fitness':'#a78bfa',
  'Finance':         '#4ade80',
  'Productivity':    '#60a5fa',
  'Other':           '#94a3b8',
};

function renderCategoryChart(breakdown) {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No active subscriptions yet.';
    p.style.color = '#64748b';
    return p;
  }
  const maxAmount = entries[0][1];
  const container = document.createElement('div');
  container.className = 'bar-chart';
  entries.forEach(([cat, amount]) => {
    const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-label">${cat}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${CATEGORY_COLORS[cat] || '#94a3b8'};"></div></div>
      <div class="bar-amount">£${amount.toFixed(2)}</div>
    `;
    container.appendChild(row);
  });
  return container;
}

function renderSparkline(months) {
  const maxTotal = Math.max(...months.map(m => m.total), 0);
  const container = document.createElement('div');
  container.className = 'sparkline';
  months.forEach(m => {
    const pct = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
    const col = document.createElement('div');
    col.className = 'spark-col';
    const bar = document.createElement('div');
    bar.className = 'spark-bar' + (m.isCurrent ? ' current' : '');
    bar.style.height = pct.toFixed(1) + '%';
    bar.style.minHeight = m.total > 0 ? '4px' : '0px';
    const label = document.createElement('div');
    label.className = 'spark-month' + (m.isCurrent ? ' current' : '');
    label.textContent = m.label;
    col.appendChild(bar);
    col.appendChild(label);
    container.appendChild(col);
  });
  return container;
}
