// Shared build helpers: text, dates and slugs.

// ------------------------------------
//                 text                
// ------------------------------------

export const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const stripHtml = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export const wordCount = (plain) => plain.split(/\s+/).filter(Boolean).length;

// Truncate at a word boundary.
export function excerpt(plain, max) {
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

// ------------------------------------
//                dates                
// ------------------------------------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const LOOKUP = new Map(MONTHS.flatMap((m, i) => [[m.toLowerCase(), i], [m.slice(0, 3).toLowerCase(), i]]));
LOOKUP.set('sept', 8);

const pad = (n) => String(n).padStart(2, '0');

// Accepts "June 4 2026", "Jun 4, 2026", "June 4th, 2026" and "2026-06-04". Returns ISO or null.
export function parseDate(input) {
  const s = input.trim();
  let y, m, d, r;
  if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    [y, m, d] = [+r[1], +r[2] - 1, +r[3]];
  } else if ((r = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(s))) {
    m = LOOKUP.get(r[1].toLowerCase());
    if (m === undefined) return null;
    [y, d] = [+r[3], +r[2]];
  } else {
    return null;
  }
  const t = new Date(Date.UTC(y, m, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m || t.getUTCDate() !== d) return null;
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

const parts = (iso) => iso.split('-').map(Number);

export const formatLong = (iso) => { const [y, m, d] = parts(iso); return `${MONTHS[m - 1]} ${d}, ${y}`; };
export const formatShort = (iso) => { const [, m, d] = parts(iso); return `${MONTHS[m - 1].slice(0, 3)} ${d}`; };
export const monthLabel = (iso) => { const [y, m] = parts(iso); return `${MONTHS[m - 1]} ${y}`; };

// ------------------------------------
//                slugs                
// ------------------------------------

const slugify = (title) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function createSlugger() {
  const used = new Set();
  return (title, iso) => {
    let base = slugify(title);
    if (!base || base === 'untitled') base = `${base || 'untitled'}-${iso}`;
    let slug = base;
    if (used.has(slug)) slug = `${base}-${iso}`;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return slug;
  };
}
