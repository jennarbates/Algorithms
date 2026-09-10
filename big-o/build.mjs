// This visual is a single hand-written HTML file with no framework and no
// dependencies, so "building" it is just copying index.html into dist/.
//
// The copy exists only so that site/build.sh treats this folder like every
// other visual: it looks for a package.json with a build script and then
// publishes dist/index.html at /big-o/. Keeping that contract means the
// deploy workflow never needs a special case.

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');

mkdirSync(dist, { recursive: true });
copyFileSync(join(here, 'index.html'), join(dist, 'index.html'));
console.log('big-o: copied index.html -> dist/index.html');
