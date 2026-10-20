import { initSidebar, read, write } from './sidebar.js';

// ------------------------------------
//         keyboard navigation
// ------------------------------------

// Left arrow: newer story. Right arrow: older story.
const TARGETS = { ArrowLeft: 'a[rel~="prev"]', ArrowRight: 'a[rel~="next"]' };

function initKeys() {
  document.addEventListener('keydown', (e) => {
    const selector = TARGETS[e.key];
    if (!selector || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('.modal-backdrop.open')) return; // topbar about modal
    const link = document.querySelector(selector);
    if (link) location.href = link.href;
  });
}

// ------------------------------------
//            scroll memory
// ------------------------------------

// remembers each story's scroll position for this tab only
const SCROLL_KEY = 'sss:scroll';

function initScrollMemory() {
  history.scrollRestoration = 'manual';
  // The canonical URL is the same for the root copy and /s/<slug>/, so both share one entry.
  const page = document.querySelector('link[rel="canonical"]')?.href ?? location.pathname;

  const load = () => {
    try { return JSON.parse(read(SCROLL_KEY, 'session')) || {}; } catch { return {}; }
  };
  const save = () => {
    const map = load();
    if (scrollY > 0) map[page] = Math.round(scrollY);
    else delete map[page];
    write(SCROLL_KEY, JSON.stringify(map), 'session');
  };

  const reloaded = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  const y = reloaded || location.hash ? 0 : load()[page] || 0;
  if (y) animateScroll(y);

  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
}

// Ease-out scroll from the top to `y` (about 0.3 to 0.7s, longer for further).
function animateScroll(y) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return scrollTo(0, y);

  const ms = Math.min(200 + y / 10, 500);
  const start = performance.now();
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  for (const type of ['wheel', 'touchstart', 'keydown']) addEventListener(type, cancel, { once: true, passive: true });

  const step = (now) => {
    if (cancelled) return;
    const t = Math.min((now - start) / ms, 1);
    scrollTo(0, y * (1 - (1 - t) ** 3)); // cubic ease-out
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ------------------------------------
//                 init
// ------------------------------------

initSidebar();
initKeys();
initScrollMemory();
