import { initSidebar } from './sidebar.js';

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
//                 init                
// ------------------------------------

initSidebar();
initKeys();
