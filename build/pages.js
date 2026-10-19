// Renders a story into a full HTML page (shell template + sidebar + pager).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DIRS, SITE } from './config.js';
import { escapeHtml as esc, formatLong, formatShort, monthLabel } from './util.js';

// Minimal {{placeholder}} templating; values are inserted as-is (callers escape).
function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`Template placeholder {{${key}}} has no value`);
    return vars[key];
  });
}

const TEMPLATE = readFileSync(path.join(DIRS.templates, 'page.html'), 'utf8');

const PANEL_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" '
  + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/></svg>';

// `base` reaches this repo's root, `parent` reaches the site root that hosts it.
export const pathsFor = (depth) => ({
  base: depth ? '../'.repeat(depth) : './',
  parent: '../'.repeat(depth + 1),
});

const storyHref = (base, s) => `${base}s/${s.slug}/`;
const storyUrl = (s) => `${SITE.url}s/${s.slug}/`;

function renderSidebar(stories, current, base) {
  const groups = [];
  for (const s of stories) {
    const key = s.iso.slice(0, 7);
    if (groups.at(-1)?.key !== key) groups.push({ key, label: monthLabel(s.iso), items: [] });
    groups.at(-1).items.push(s);
  }

  const list = groups.map((g) => `
        <section class="sb-group">
          <h2 class="sb-group-label">${esc(g.label)}</h2>
          <ul class="sb-items">${g.items.map((s) => {
            const on = s === current;
            return `
            <li><a class="sb-link${on ? ' is-current' : ''}" href="${storyHref(base, s)}"${on ? ' aria-current="page"' : ''}>`
              + `<span class="sb-link-title">${esc(s.title)}</span>`
              + `<time class="sb-link-date" datetime="${s.iso}">${formatShort(s.iso)}</time></a></li>`;
          }).join('')}
          </ul>
        </section>`).join('');

  return `
  <button class="sb-btn sb-btn--open" type="button" data-sidebar-toggle aria-controls="sidebar" aria-label="Show all stories">${PANEL_ICON}</button>
  <div class="sb-backdrop" data-sidebar-close></div>
  <aside class="sidebar" id="sidebar" aria-label="All stories">
    <div class="sb-head">
      <a class="sb-brand" href="${base}"><span class="sb-brand-title">${esc(SITE.title)}</span><span class="sb-brand-sub">${esc(SITE.subtitle)}</span></a>
      <button class="sb-btn" type="button" data-sidebar-toggle aria-controls="sidebar" aria-label="Hide all stories">${PANEL_ICON}</button>
    </div>
    <nav class="sb-scroll" aria-label="Stories">${list}
    </nav>
  </aside>`;
}

function pagerLink(base, s, rel, label) {
  if (!s) return '<span class="pager-gap"></span>';
  return `<a class="pager-link pager-${rel}" rel="${rel}" href="${storyHref(base, s)}">`
    + `<span class="pager-dir">${label}</span><span class="pager-title">${esc(s.title)}</span></a>`;
}

const renderPager = (s, base) => `<nav class="pager" aria-label="More stories">
    ${pagerLink(base, s.newer, 'prev', '← newer')}
    ${pagerLink(base, s.older, 'next', 'older →')}
  </nav>`;

// `depth` 0 renders the root copy (newest story); 2 renders s/<slug>/index.html.
export function renderPage(story, all, depth) {
  const { base, parent } = pathsFor(depth);
  const prefetch = [story.older, story.newer].filter(Boolean)
    .map((s) => `<link rel="prefetch" href="${storyHref(base, s)}">`).join('\n  ');
  const description = story.excerpt || SITE.subtitle;
  const title = `${story.title} · ${SITE.shortTitle}`;

  return fill(TEMPLATE, {
    lang: SITE.lang,
    pageTitle: esc(title),
    description: esc(description),
    canonical: storyUrl(story),
    published: story.iso,
    ogImage: SITE.ogImage,
    siteName: esc(SITE.shortTitle),
    base,
    parent,
    prefetch,
    sidebar: renderSidebar(all, story, base),
    iso: story.iso,
    dateLong: formatLong(story.iso),
    title: esc(story.title),
    meta: `${story.words.toLocaleString('en-US')} words · ${story.minutes} min read`,
    body: story.html,
    pager: renderPager(story, base),
  });
}
