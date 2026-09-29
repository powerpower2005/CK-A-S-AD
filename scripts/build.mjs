import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, validateData } from './validate-data.mjs';

const catalog = await validateData();
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== path.resolve(root)) throw new Error('Output must stay inside the project.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Only public site files are included in the deployment artifact.
for (const file of ['index.html', '404.html', 'assets', 'data', ...catalog.map(item => item.id)]) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}
// Counts are derived from question data so authors never maintain them twice.
await writeFile(path.join(output, 'data/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Static site is ready in dist/.');
