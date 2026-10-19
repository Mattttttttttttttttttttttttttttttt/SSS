// Reads ./src/*.md, splits it into stories and returns them ordered, slugged and rendered.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DIRS, EXCERPT_LENGTH, STOP_HEADINGS, WORDS_PER_MINUTE } from './config.js';
import { createSlugger, excerpt, parseDate, stripHtml, wordCount } from './util.js';
import { renderMarkdown } from './markdown.js';

// ------------------------------------
//             source files            
// ------------------------------------

const H1 = /^#\s+(.*?)\s*#*\s*$/;
const UNESCAPE = /\\([!-/:-@[-`{-~])/g;

// Strip emphasis markers and escapes from heading text.
const cleanHeading = (raw) =>
  raw.replace(/<\/?[a-z][^>]*>/gi, '').replace(/(?<!\\)(\*+|~~)/g, '').replace(UNESCAPE, '$1').trim();

function parseHeading(text, file, errors) {
  const cut = text.lastIndexOf('|');
  const iso = cut === -1 ? null : parseDate(text.slice(cut + 1));
  if (!iso) {
    errors.push(`${file}: cannot read a date from heading "${text}" (expected "Title | Month D YYYY")`);
    return null;
  }
  return { title: text.slice(0, cut).trim() || 'Untitled', iso };
}

function splitFile(file, errors) {
  const md = readFileSync(path.join(DIRS.src, file), 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ');

  const stories = [];
  let current = null;
  for (const line of md.split('\n')) {
    const m = H1.exec(line);
    if (m) {
      const text = cleanHeading(m[1]);
      if (STOP_HEADINGS.includes(text.toLowerCase())) break;
      const head = parseHeading(text, file, errors);
      current = head && { ...head, file, lines: [] };
      if (current) stories.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return stories
    .map(({ lines, ...s }) => ({ ...s, markdown: lines.join('\n').trim() }))
    .filter((s) => {
      if (!s.markdown) console.warn(`warning: "${s.title}" (${s.iso}) in ${file} has no text, skipped`);
      return s.markdown;
    });
}

function readSources() {
  const files = readdirSync(DIRS.src)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
  if (!files.length) throw new Error('No .md files found in ./src');

  const errors = [];
  const stories = files.flatMap((f) => splitFile(f, errors));
  if (errors.length) throw new Error(errors.join('\n'));
  if (!stories.length) throw new Error('No stories found in ./src');
  return stories;
}

// ------------------------------------
//        ordering and rendering       
// ------------------------------------

// Returns stories newest first. `older` / `newer` link neighbours.
export function buildStories() {
  const raw = readSources().map((s, seq) => ({ ...s, seq }));

  // Chronological; same-day ties keep file/document order (later in the doc = newer).
  raw.sort((a, b) => a.iso.localeCompare(b.iso) || a.seq - b.seq);

  const slugFor = createSlugger();
  const stories = raw.map((s) => {
    const html = renderMarkdown(s.markdown);
    const plain = stripHtml(html);
    const words = wordCount(plain);
    const firstPara = /<p>([\s\S]*?)<\/p>/.exec(html);
    return {
      title: s.title,
      iso: s.iso,
      slug: slugFor(s.title, s.iso),
      html,
      words,
      minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
      excerpt: excerpt(stripHtml(firstPara ? firstPara[1] : plain), EXCERPT_LENGTH),
    };
  });

  stories.forEach((s, i) => {
    s.older = stories[i - 1] ?? null;
    s.newer = stories[i + 1] ?? null;
  });
  return stories.reverse();
}
