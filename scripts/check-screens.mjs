import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceDirs = ['screens', 'components', 'redux', 'hooks', 'services', 'utils', 'config', 'theme'];

function allJavaScript(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? allJavaScript(path) : entry.name.endsWith('.js') ? [path] : [];
  });
}

const files = [join(root, 'App.js'), join(root, 'index.js'), ...sourceDirs.flatMap((dir) => allJavaScript(join(root, dir)))];
const app = readFileSync(join(root, 'App.js'), 'utf8');
let checked = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const relativeImports = /(?:\bfrom\s*|\bimport\s*|\brequire\(\s*|\bimport\(\s*)['"](\.{1,2}\/[^'"\n]+)['"]/g;
  for (const [, specifier] of source.matchAll(relativeImports)) {
    const target = resolve(dirname(file), specifier);
    assert.ok(existsSync(target) || existsSync(`${target}.js`) || existsSync(join(target, 'index.js')), `${file}: ${specifier} does not exist`);
    checked++;
  }
}

const screens = allJavaScript(join(root, 'screens'));
for (const screen of screens) {
  const name = screen.split('/').at(-1).replace(/\.js$/, '');
  assert.ok(new RegExp(`\\bimport\\s+${name}\\s+from\\s+['"]`).test(app) ||
    // CustomerService.js is registered with the longer component name.
    (name === 'CustomerService' && app.includes("screens/support/CustomerService")),
  `Screen ${name} is not imported into App.js`);
}
console.log(`Checked ${screens.length} screens and ${checked} relative imports.`);
