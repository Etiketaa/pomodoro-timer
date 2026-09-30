/**
 * Post-build: inyecta los hashes reales del bundle en el service worker.
 *
 * Vite genera assets con hash en el nombre (index-XXXX.js). El sw.js los
 * necesita para la precarga, pero no puede conocerlos antes del build. Antes
 * estaban escritos a mano, y por eso cualquier rebuild dejaba la precarga
 * apuntando a archivos inexistentes.
 *
 * También versiona el caché para que los clientes con un SW viejo (o sea,
 * con otro CACHE_NAME) se purguen al activar el nuevo. El nombre sale de un
 * hash de los assets, no de un contador: ver el comentario largo abajo.
 */
import { createHash } from 'node:crypto';
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

// Versiona el caché a partir del contenido real del bundle.
//
// Por qué no un número que se incrementa: probé las dos formas. El contador
// se bumpea desde el número que hay en el archivo, así que depende de que
// alguien commitee el sw.js generado entre builds. Si hacés dos builds sin
// commitear, los dos dan v11, y un cliente que ya tenía v11 de un deploy
// anterior no purga nada: el bundle viejo se queda en el caché para siempre.
// Derivarlo del contenido no depende de acordarse de commitear: si el bundle
// cambió, el nombre del caché cambia.
//
// Esto antes no pasaba. El comentario de este archivo decía que bumpeaba la
// versión, pero CACHE_NAME solo aparecía adentro, o sea únicamente en el
// comentario. Como el bundle se sirve Cache First y los nombres llevan hash,
// cada build metía sus assets nuevos en el MISMO caché y el handler de
// activate —que borra solo los cachés con otro nombre— no purgaba nada.
// Resultado: cada cliente acumulaba un bundle de ~110 KB por build, para
// siempre. Bump manual tampoco servía: es fácil olvidarlo.
const CACHE_LINE = /^const CACHE_NAME = 'pomodoro-timer-cache-[a-z0-9]+';$/m;
if (!CACHE_LINE.test(sw)) {
  console.error("postbuild: no encontré la línea const CACHE_NAME = 'pomodoro-timer-cache-…';");
  console.error('Sin poder versionarla, los cachés viejos no se purgarían. No sigo.');
  process.exit(1);
}

const digest = createHash('sha256')
  .update(files.map((f) => f.trim()).join('\n'))
  .digest('hex')
  .slice(0, 8);
const cacheName = `pomodoro-timer-cache-${digest}`;

writeFileSync(
  SW,
  sw
    .replace(CACHE_LINE, `const CACHE_NAME = '${cacheName}';`)
    .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = [\n${files.join(',\n')}\n];`)
);

console.log(`postbuild: ${files.length} asset(s) inyectados en sw.js, caché ${cacheName}`);
for (const f of files) console.log(`  ${f.trim()}`);
