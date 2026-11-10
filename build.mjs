import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

import { readdir } from 'node:fs/promises';

const simOnly = process.argv.includes('--sim-only');
const testsOnly = process.argv.includes('--tests');

if (testsOnly) {
  const testFiles = (await readdir('tests')).filter((name) => name.endsWith('.test.ts'));
  await build({
    entryPoints: testFiles.map((name) => `tests/${name}`),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outdir: 'dist/tests',
    outExtension: { '.js': '.cjs' },
    logLevel: 'warning',
  });
  process.exit(0);
}

await build({
  entryPoints: ['sim/balance-sim.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/balance-sim.cjs',
  logLevel: 'warning',
});

if (!simOnly) {
  const result = await build({
    entryPoints: ['src/ui/main.ts'],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    logLevel: 'warning',
  });
  // Code snippets contain "</script>" and "<!--". Escape both so the inline script can't end early.
  const script = result.outputFiles[0].text
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
  const template = await readFile('src/page.html', 'utf8');
  const page = template.replace('/*__GAME_SCRIPT__*/', () => script);
  await writeFile('dist/under-construction.html', page);
  const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${page}</body></html>`;
  await writeFile('dist/preview.html', preview);
  console.log(`Built dist/under-construction.html (${(page.length / 1024).toFixed(0)} KB)`);
}
