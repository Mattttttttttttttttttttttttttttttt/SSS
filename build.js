// Builds the site:
// node build.js
// Reads ./src/*.md and writes ./index.html (newest story) and ./s/<slug>/index.html.
// node build.js [output-dir]
// With an output directory, writes only deployable files there.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DIRS, ROOT } from './build/config.js';
import { buildStories } from './build/stories.js';
import { renderPage } from './build/pages.js';

try {
  const outputDir = process.argv[2];
  const deploy = Boolean(outputDir);
  const outputRoot = deploy ? path.resolve(outputDir) : ROOT;

  if (deploy) {
    rmSync(outputRoot, { recursive: true, force: true });
    mkdirSync(outputRoot, { recursive: true });
    for (const assetDir of ['css', 'js', 'icons']) {
      cpSync(path.join(ROOT, assetDir), path.join(outputRoot, assetDir), { recursive: true });
    }
  }

  const stories = buildStories(); // newest first

  const storiesDir = deploy ? path.join(outputRoot, 's') : DIRS.stories;
  rmSync(storiesDir, { recursive: true, force: true });
  for (const s of stories) {
    const dir = path.join(storiesDir, s.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.html'), renderPage(s, stories, 2));
  }
  writeFileSync(path.join(outputRoot, 'index.html'), renderPage(stories[0], stories, 0));

  console.log(`built ${stories.length} stories ${deploy ? `to ${outputRoot}` : 'in place'}; newest: ${stories[0].title} (${stories[0].iso})`);
} catch (err) {
  console.error(`build failed:\n${err.message}`);
  process.exit(1);
}
