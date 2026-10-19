// Builds the site: node build.js
// Reads ./src/*.md and writes ./index.html (newest story) and ./s/<slug>/index.html.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIRS, ROOT } from './build/config.js';
import { buildStories } from './build/stories.js';
import { renderPage } from './build/pages.js';

try {
  const stories = buildStories(); // newest first

  rmSync(DIRS.stories, { recursive: true, force: true });
  for (const s of stories) {
    const dir = path.join(DIRS.stories, s.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.html'), renderPage(s, stories, 2));
  }
  writeFileSync(path.join(ROOT, 'index.html'), renderPage(stories[0], stories, 0));

  console.log(`built ${stories.length} stories; newest: ${stories[0].title} (${stories[0].iso})`);
} catch (err) {
  console.error(`build failed:\n${err.message}`);
  process.exit(1);
}
