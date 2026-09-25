/**
 * Falla si el build commiteado en public/ no coincide con lo que produce
 * el código fuente.
 *
 * El problema que previene: public/ es un build de Vite commiteado. Si se
 * edita frontend/src y no se corre `npm run build`, el deploy sigue
 * sirviendo el bundle viejo y nadie se entera hasta que un usuario reporta
 * que no ve el cambio.
 *
 * Uso (desde la raíz del repo):  node scripts/check-build-fresh.mjs
 * En CI: esto antes de buildear, o después de buildear (en ambos casos
 * `git diff --exit-code public/` tiene que salir limpio).
 */
import { execSync } from 'node:child_process';

const FRONTEND = 'frontend';

function sh(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

console.log('check-build-fresh: rebuildeando desde el código fuente...');
sh('npm run build', FRONTEND);

let diff;
try {
  diff = sh('git status --porcelain public/', '.');
} catch (e) {
  // status no falla nunca; por si acaso
  diff = '';
  console.error('check-build-fresh: no se pudo leer el estado de git.');
  process.exit(1);
}

const cambios = diff.split('\n').map((l) => l.trim()).filter(Boolean);

if (cambios.length === 0) {
  console.log('check-build-fresh: OK — public/ está sincronizado con frontend/src.');
  process.exit(0);
}

console.error('\ncheck-build-fresh: FALLA — public/ está desactualizado.\n');
console.error('El bundle commiteado no coincide con el código fuente:');
for (const c of cambios) console.error(`  ${c}`);
console.error('\nPara arreglarlo:');
console.error('  cd frontend && npm run build && git add ../public && git commit');
process.exit(1);
