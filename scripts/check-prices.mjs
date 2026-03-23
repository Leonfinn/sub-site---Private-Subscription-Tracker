#!/usr/bin/env node
// scripts/check-prices.mjs
// Price-change monitor for Sub-Site.
// Reads monitored-urls.json, fetches each pricing page, hashes title + first price pattern,
// and compares against stored hashes in data/price-hashes.json.
// Exits 0 if no changes, exits 1 if any hash changed (triggers PR creation in Gitea Actions).

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HASH_FILE = join(__dirname, '..', 'data', 'price-hashes.json');
const URLS_FILE = join(__dirname, '..', 'public', 'data', 'monitored-urls.json');
const DELAY_MS  = 1500; // polite crawl delay between requests

const monitoredUrls = JSON.parse(readFileSync(URLS_FILE, 'utf8'));
const storedHashes  = JSON.parse(readFileSync(HASH_FILE, 'utf8'));

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.5',
};

async function fetchPage(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function extractContent(html) {
  // Extract <title> text — stable across most sites
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || ['', ''])[1].trim();
  // Extract first currency+digit pattern — catches price changes
  const price  = (html.match(/[£$€]\s*\d[\d.,]*/) || [''])[0].trim();
  return title + '||' + price;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const changed   = [];
const newHashes = { ...storedHashes };

for (let i = 0; i < monitoredUrls.length; i++) {
  const { key, url } = monitoredUrls[i];
  if (i > 0) await sleep(DELAY_MS);

  try {
    const html    = await fetchPage(url);
    const content = extractContent(html);
    const hash    = createHash('sha256').update(content).digest('hex');

    if (storedHashes[key] && storedHashes[key] !== hash) {
      changed.push(key);
      console.log(`CHANGED: ${key}  (${url})`);
    } else if (!storedHashes[key]) {
      console.log(`NEW:     ${key}  — initial hash recorded`);
    } else {
      console.log(`OK:      ${key}`);
    }
    newHashes[key] = hash;
  } catch (err) {
    // On error: log a warning but preserve the old hash.
    // This prevents transient network failures from triggering a false PR.
    console.warn(`SKIP:    ${key}  — ${err.message}`);
  }
}

writeFileSync(HASH_FILE, JSON.stringify(newHashes, null, 2) + '\n');

if (changed.length > 0) {
  console.log(`\n⚠  ${changed.length} service(s) with changed content: ${changed.join(', ')}`);
  console.log('Review these services and update price + lastVerified in public/data/affiliates.js');
  process.exit(1);
} else {
  console.log('\n✓  No pricing page changes detected.');
}
