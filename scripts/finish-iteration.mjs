import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

function resolveCommand(command) {
  if (process.platform === 'win32') {
    if (command === 'npm') return 'npm.cmd';
  }
  return command;
}

function run(command, args, options = {}) {
  const resolvedCommand = resolveCommand(command);
  const pretty = [command, ...args].join(' ');
  console.log(`\n▶ ${pretty}`);

  const shouldUseShell = process.platform === 'win32' && resolvedCommand.endsWith('.cmd');

  const result = spawnSync(resolvedCommand, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: shouldUseShell,
    ...options,
  });

  if (result.error) throw result.error;
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`Falló: ${pretty} (exit ${result.status})`);
  }
}

function readPackageVersion() {
  const pkgPath = path.join(repoRoot, 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  return pkg.version;
}

function ensureGitRepo() {
  const gitDir = path.join(repoRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error('No se encontró .git. Ejecuta esto dentro de un repo git.');
  }
}

async function main() {
  ensureGitRepo();

  const argv = process.argv.slice(2);

  // Reglas de uso:
  // - `npm run iter -- "Desc"` (bump patch automático)
  // - `npm run iter -- 4.9.70 "Desc"` (forzar versión)
  // - Fecha opcional: BUMP_DATE=YYYY-MM-DD
  if (argv.length === 0) {
    throw new Error('Uso: npm run iter -- "Descripción"  (o: npm run iter -- x.y.z "Descripción")');
  }

  // 1) Bump + sincronización (graph + labels + PWA)
  run('node', ['scripts/bump-version.mjs', ...argv]);

  // 2) Checks (version sync + lint + build)
  run('npm', ['run', 'check']);

  // 3) Commit
  const version = readPackageVersion();
  run('git', ['add', '-A']);

  // Incluir descripción en el mensaje del commit (primer argumento no-version o el resto)
  const isSemver = /^\d+\.\d+\.\d+$/.test(argv[0]);
  const descParts = isSemver ? argv.slice(1) : argv;
  const desc = descParts.join(' ').trim();
  const message = desc ? `chore: release v${version} - ${desc}` : `chore: release v${version}`;

  run('git', ['commit', '-m', message]);

  // 4) Push
  run('git', ['push']);

  // 5) Deploy (GitHub Pages). Esto corre `predeploy` automáticamente.
  run('npm', ['run', 'deploy']);

  console.log(`\n✅ Iteración publicada en producción: v${version}`);
}

main().catch((err) => {
  console.error(`\n❌ finish-iteration: ${err?.message || err}`);
  process.exit(1);
});
