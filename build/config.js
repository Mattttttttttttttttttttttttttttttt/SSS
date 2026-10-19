// Build-time configuration. Everything site-specific lives here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DIRS = {
  src: path.join(ROOT, 'src'),
  templates: path.join(ROOT, 'templates'),
  stories: path.join(ROOT, 's'),
};

export const SITE = {
  title: 'Short Story Saturdays',
  shortTitle: 'SSS', // browser tab title suffix, link previews and the topbar
  subtitle: 'a collection of cosmic dusts',
  lang: 'en',
  // Absolute URLs are required by canonical/Open Graph tags; every other path is relative.
  url: 'https://matt-meow.web.app/sss/',
  ogImage: 'https://matt-meow.web.app/icons/icon-512.png',
};

// A level-1 heading with one of these titles ends parsing of that file.
export const STOP_HEADINGS = ['ideas'];

export const WORDS_PER_MINUTE = 230;
export const EXCERPT_LENGTH = 160;
