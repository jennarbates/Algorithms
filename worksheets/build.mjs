// Builds the printable workbooks as HTML, then prints each to PDF with headless Chrome.
//
//   node worksheets/build.mjs

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBigO } from './bigo.mjs';
import { buildGS } from './gs.mjs';
import { buildGraphs } from './graphs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

for (const [name, html] of [['big-o-workbook', buildBigO()], ['gale-shapley-workbook', buildGS()], ['graphs-workbook', buildGraphs()]]) {
  const htmlPath = join(here, `${name}.html`);
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${join(here, `${name}.pdf`)}`, `file://${htmlPath}`,
  ], { stdio: 'ignore' });
  console.log('wrote', name);
}
