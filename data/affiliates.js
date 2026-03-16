// data/affiliates.js
// Affiliate data — populated with AFFILIATE_URL placeholders.
// Replace all AFFILIATE_URL values with real affiliate links before going live.

const KNOWN_SERVICES = {
  // Streaming
  'netflix':            { alt: 'Amazon Prime Video',       saving: '~£9/mo',           url: 'AFFILIATE_URL' },
  'disney+':            { alt: 'Apple TV+',                saving: '~£4/mo',            url: 'AFFILIATE_URL' },
  'disney plus':        { alt: 'Apple TV+',                saving: '~£4/mo',            url: 'AFFILIATE_URL' },
  'amazon prime':       { alt: 'Freesat + ITVX',           saving: '~£9/mo',            url: 'AFFILIATE_URL' },
  'amazon prime video': { alt: 'Freesat + ITVX',           saving: '~£9/mo',            url: 'AFFILIATE_URL' },
  'apple tv+':          { alt: 'Freesat',                  saving: '~£9/mo',            url: 'AFFILIATE_URL' },
  'paramount+':         { alt: 'ITVX Premium',             saving: '~£4/mo',            url: 'AFFILIATE_URL' },
  'now tv':             { alt: 'Freeview + ITVX',          saving: '~£10/mo',           url: 'AFFILIATE_URL' },
  'now':                { alt: 'Freeview + ITVX',          saving: '~£10/mo',           url: 'AFFILIATE_URL' },

  // Music
  'spotify':            { alt: 'YouTube Premium',          saving: '~£1/mo',            url: 'AFFILIATE_URL' },
  'apple music':        { alt: 'Spotify Free',             saving: '~£11/mo',           url: 'AFFILIATE_URL' },
  'tidal':              { alt: 'Spotify',                  saving: '~£4/mo',            url: 'AFFILIATE_URL' },
  'deezer':             { alt: 'Spotify Free',             saving: '~£11/mo',           url: 'AFFILIATE_URL' },
  'amazon music':       { alt: 'Spotify Free',             saving: '~£9/mo',            url: 'AFFILIATE_URL' },

  // Software / SaaS
  'adobe cc':           { alt: 'Affinity Suite',           saving: '~£47/mo (one-off)', url: 'AFFILIATE_URL' },
  'adobe creative cloud':{ alt: 'Affinity Suite',          saving: '~£47/mo (one-off)', url: 'AFFILIATE_URL' },
  'microsoft 365':      { alt: 'LibreOffice (free)',        saving: '~£10/mo',           url: 'AFFILIATE_URL' },
  'office 365':         { alt: 'LibreOffice (free)',        saving: '~£10/mo',           url: 'AFFILIATE_URL' },
  'notion':             { alt: 'Obsidian (free)',           saving: '~£8/mo',            url: 'AFFILIATE_URL' },
  'evernote':           { alt: 'Obsidian (free)',           saving: '~£8/mo',            url: 'AFFILIATE_URL' },
  'figma':              { alt: 'Penpot (free)',             saving: '~£12/mo',           url: 'AFFILIATE_URL' },
  'canva':              { alt: 'GIMP + Inkscape (free)',    saving: '~£13/mo',           url: 'AFFILIATE_URL' },
  'grammarly':          { alt: 'LanguageTool (free tier)',  saving: '~£13/mo',           url: 'AFFILIATE_URL' },

  // Cloud Storage
  'dropbox':            { alt: 'pCloud (lifetime plan)',   saving: '~£10/mo',           url: 'AFFILIATE_URL' },
  'google one':         { alt: 'Proton Drive',             saving: 'Similar cost, more privacy', url: 'AFFILIATE_URL' },
  'icloud+':            { alt: 'Proton Drive',             saving: 'Similar cost, more privacy', url: 'AFFILIATE_URL' },
  'onedrive':           { alt: 'pCloud (lifetime plan)',   saving: '~£7/mo',            url: 'AFFILIATE_URL' },

  // Gaming
  'xbox game pass':     { alt: 'PC Game Pass',             saving: '~£5/mo',            url: 'AFFILIATE_URL' },
  'playstation plus':   { alt: 'PS Plus Essential',        saving: '~£5/mo',            url: 'AFFILIATE_URL' },
  'nintendo switch online':{ alt: 'Family Plan share',     saving: '~£2/mo',            url: 'AFFILIATE_URL' },

  // Productivity
  'todoist':            { alt: 'TickTick (free tier)',      saving: '~£4/mo',            url: 'AFFILIATE_URL' },
  '1password':          { alt: 'Bitwarden (free)',          saving: '~£3/mo',            url: 'AFFILIATE_URL' },
  'lastpass':           { alt: 'Bitwarden (free)',          saving: '~£3/mo',            url: 'AFFILIATE_URL' },

  // Finance
  'quickbooks':         { alt: 'Wave (free)',               saving: '~£20/mo',           url: 'AFFILIATE_URL' },
  'xero':               { alt: 'Wave (free)',               saving: '~£15/mo',           url: 'AFFILIATE_URL' },
};

const CATEGORY_FALLBACKS = {
  'Streaming':       { alt: 'Check Freesat / Freeview for free TV', url: 'AFFILIATE_URL' },
  'Software / SaaS': { alt: 'Browse open-source alternatives at AlternativeTo', url: 'AFFILIATE_URL' },
  'Cloud Storage':   { alt: 'pCloud — one-time payment, lifetime storage', url: 'AFFILIATE_URL' },
  'Gaming':          { alt: 'Xbox Game Pass Ultimate for multi-platform value', url: 'AFFILIATE_URL' },
  'Music':           { alt: 'YouTube Music — free tier with ads', url: 'AFFILIATE_URL' },
  'News / Media':    { alt: 'BBC News / The Guardian — free access', url: 'AFFILIATE_URL' },
  'Health & Fitness':{ alt: 'NHS Fitness Studio — free workout videos', url: 'AFFILIATE_URL' },
  'Finance':         { alt: 'Wave — free accounting for small businesses', url: 'AFFILIATE_URL' },
  'Productivity':    { alt: 'Notion free tier or LibreOffice', url: 'AFFILIATE_URL' },
  'Other':           { alt: 'Search AlternativeTo for cheaper options', url: 'AFFILIATE_URL' },
};
