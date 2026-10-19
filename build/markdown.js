// Markdown -> HTML, tuned for Google Docs exports.

import { escapeHtml } from './util.js';

// ------------------------------------
//      inline (bold, links, ...)      
// ------------------------------------

const OPEN = '\uE000';
const CLOSE = '\uE001';
const TOKEN = new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g');
const SAFE_URL = /^(https?:|mailto:|#|\/|\.{1,2}\/)/i;
const ESCAPABLE = /\\([!-/:-@[-`{-~])/g;

const MARKERS = { '*': ['em'], '**': ['strong'], '***': ['strong', 'em'], '~~': ['s'] };

// Docs exports balanced WYSIWYG markers (and sometimes pads them with spaces), so
// markers are treated as toggles on a tag stack instead of using flanking rules.
function emphasis(s) {
  const parts = s.split(/(\*{1,3}|~~)/);
  const counts = {};
  for (const p of parts) for (const t of MARKERS[p] ?? []) counts[t] = (counts[t] ?? 0) + 1;
  if (Object.values(counts).some((n) => n % 2)) return s; // unbalanced: leave literal

  const stack = [];
  const close = (tag) => {
    const above = stack.splice(stack.lastIndexOf(tag));
    above.reverse();
    const reopen = above.filter((t) => t !== tag).reverse();
    stack.push(...reopen);
    return above.map((t) => `</${t}>`).join('') + reopen.map((t) => `<${t}>`).join('');
  };
  return parts
    .map((p) => {
      const tags = MARKERS[p];
      if (!tags) return p;
      if (tags.every((t) => stack.includes(t))) {
        return [...tags].sort((a, b) => stack.lastIndexOf(b) - stack.lastIndexOf(a)).map(close).join('');
      }
      return tags
        .map((t) => (stack.includes(t) ? close(t) : (stack.push(t), `<${t}>`)))
        .join('');
    })
    .join('');
}

function run(src, hold) {
  let s = src;
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => hold(`<code>${escapeHtml(code.trim())}</code>`));
  s = s.replace(/(?: {2,}|\\)\n/g, () => hold('<br>'));
  s = s.replace(ESCAPABLE, (_, ch) => hold(escapeHtml(ch)));
  s = s.replace(/<(\/?)u>/gi, (_, slash) => hold(`<${slash}u>`));
  s = s.replace(/<br\s*\/?>/gi, () => hold('<br>'));
  s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (_, url) => hold(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`));
  s = s.replace(/\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g, (_, text, url) =>
    hold(SAFE_URL.test(url) ? `<a href="${escapeHtml(url)}">${run(text, hold)}</a>` : run(text, hold)));
  s = s.replace(/\s*\n\s*/g, ' ');
  s = escapeHtml(s);
  s = emphasis(s);
  s = s.replace(/(^|[^\w])__(?=\S)(.+?\S)__(?!\w)/g, '$1<strong>$2</strong>');
  s = s.replace(/(^|[^\w])_(?=\S)(.+?\S)_(?!\w)/g, '$1<em>$2</em>');
  return s;
}

function inline(src) {
  const stash = [];
  const hold = (html) => OPEN + (stash.push(html) - 1) + CLOSE;
  let s = run(src, hold);
  while (s.includes(OPEN)) s = s.replace(TOKEN, (_, i) => stash[i]);
  return s;
}

// ------------------------------------
//   blocks (paragraphs, quotes, ...)  
// ------------------------------------

const HR = /^\s*(?:\\?[*\-_~]\s*){3,}$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const UL = /^\s*[*+-]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;
const REF_DEF = /^\[[^\]]+\]:\s*\S+/; // image/link reference definitions in Docs exports

const startsBlock = (l) => HR.test(l) || HEADING.test(l) || QUOTE.test(l) || UL.test(l) || OL.test(l);

function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (HR.test(line)) { out.push('<hr class="scene-break">'); i++; continue; }

    const h = HEADING.exec(line);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }

    if (QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && QUOTE.test(lines[i])) buf.push(QUOTE.exec(lines[i++])[1]);
      out.push(`<blockquote>${blocks(buf)}</blockquote>`);
      continue;
    }

    const re = UL.test(line) ? UL : OL.test(line) ? OL : null;
    if (re) {
      const tag = re === UL ? 'ul' : 'ol';
      const items = [];
      while (i < lines.length) {
        const m = re.exec(lines[i]);
        if (m && !HR.test(lines[i])) items.push(m[1]);
        else if (items.length && /^\s{2,}\S/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim();
        else break;
        i++;
      }
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) buf.push(lines[i++]);
    const html = inline(buf.join('\n')).trim();
    if (html) out.push(`<p>${html}</p>`);
  }
  return out.join('\n');
}

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n').filter((l) => !REF_DEF.test(l));
  return blocks(lines);
}
