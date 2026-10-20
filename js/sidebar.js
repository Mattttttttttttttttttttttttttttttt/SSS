// Sidebar open/close, persisted on desktop; overlay behaviour on mobile.

// ------------------------------------
//               storage
// ------------------------------------

const area = (kind) => (kind === 'session' ? sessionStorage : localStorage);

export function read(key, kind = 'local') {
  try { return area(kind).getItem(key); } catch { return null; }
}

export function write(key, value, kind = 'local') {
  try { area(kind).setItem(key, value); } catch { /* storage unavailable */ }
}

// ------------------------------------
//               sidebar
// ------------------------------------

const PREF_KEY = 'sss-sidebar';
const SCROLL_KEY = 'sss-sidebar-scroll';
const desktop = matchMedia('(min-width: 900px)');
const root = document.documentElement;

const isOpen = () => root.dataset.sidebar === 'open';

function setState(state, persist = false) {
  root.dataset.sidebar = state;
  document.querySelectorAll('[data-sidebar-toggle]')
    .forEach((b) => b.setAttribute('aria-expanded', String(state === 'open')));
  if (persist && desktop.matches) write(PREF_KEY, state);
}

// Keep the current story visible without scrolling the page itself.
function revealCurrent(list) {
  const el = list.querySelector('.is-current');
  if (!el) return;
  const top = el.offsetTop;
  const bottom = top + el.offsetHeight;
  if (top < list.scrollTop + 8) list.scrollTop = top - 48;
  else if (bottom > list.scrollTop + list.clientHeight - 8) list.scrollTop = bottom - list.clientHeight + 48;
}

// Keep wheel scrolling over the sidebar from leaking to the page.
function lockWheel(list) {
  document.getElementById('sidebar').addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // pinch / ctrl-zoom
    const atEnd = e.deltaY < 0
      ? list.scrollTop <= 0
      : list.scrollTop >= list.scrollHeight - list.clientHeight - 1;
    if (!list.contains(e.target) || atEnd) e.preventDefault();
  }, { passive: false });
}

export function initSidebar() {
  setState(root.dataset.sidebar || 'closed');

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-sidebar-toggle]')) setState(isOpen() ? 'closed' : 'open', true);
    else if (e.target.closest('[data-sidebar-close]')) setState('closed');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen() && !desktop.matches) setState('closed');
  });

  // Crossing the breakpoint resets to that mode's default.
  desktop.addEventListener('change', (e) =>
    setState(e.matches && read(PREF_KEY) !== 'closed' ? 'open' : 'closed'));

  const list = document.querySelector('.sb-scroll');
  if (!list) return;
  lockWheel(list);
  list.scrollTop = Number(read(SCROLL_KEY, 'session')) || 0;
  revealCurrent(list);
  addEventListener('pagehide', () => write(SCROLL_KEY, String(list.scrollTop), 'session'));
}
