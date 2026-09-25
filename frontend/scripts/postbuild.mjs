/**
 * Post-build: inyecta los hashes reales del bundle en el service worker.
 *
 * Vite genera assets con hash en el nombre (index-XXXX.js). El sw.js los
 * necesita para la precarga, pero no puede conocerlos antes del build. Antes
 * estaban escritos a mano, y por eso cualquier rebuild dejaba la precarga
 * apuntando a archivos inexistentes.
 *
 * También sube la versión de caché para que los clientes con un SW viejo
 * (o sea, con otro CACHE_NAME) se purguen al activar el nuevo.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = new URL('../../public/', import.meta.url).pathname;
const ASSETS_DIR = join(PUBLIC_DIR, 'assets');
const SW = join(PUBLIC_DIR, 'sw.js');

const files = readdirSync(ASSETS_DIR)
  .filter((f) => /\.(js|css)$/.test(f))
  .sort()
  .map((f) => `  '/assets/${f}'`);

if (files.length === 0) {
  console.error('postbuild: no hay assets en public/assets/. ¿Corrió vite build?');
  process.exit(1);
}

const sw = readFileSync(SW, 'utf8');

if (!sw.includes('const BUILD_ASSETS = [];')) {
  console.error("postbuild: no encontré 'const BUILD_ASSETS = [];' en public/sw.js.");
  console.error('Revisá que el placeholder siga intacto (no lo reescribas a mano).');
  process.exit(1);
}

writeFileSync(
  SW,
  sw.replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = [\n${files.join(',\n')}\n];`)
);

console.log(`postbuild: ${files.length} asset(s) inyectados en sw.js`);
for (const f of files) console.log(`  ${f.trim()}`);
