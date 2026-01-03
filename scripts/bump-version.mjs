import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

function parseArgs(argv) {
  const args = {
    version: null,
    changes: [],
    date: process.env.BUMP_DATE || new Date().toISOString().slice(0, 10),
    positionals: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('-')) {
      args.positionals.push(a);
      continue;
    }
    if (a === '--set-version') {
      args.version = argv[i + 1] || null;
      i++;
      continue;
    }
    if (a === '--date') {
      args.date = argv[i + 1] || args.date;
      i++;
      continue;
    }
    if (a === '--change' || a === '--changes' || a === '-c') {
      const v = argv[i + 1];
      if (v) args.changes.push(v);
      i++;
      continue;
    }
  }

  // Compatibilidad posicional (recomendado vía `npm run bump -- ...`)
  // - Si el primer posicional es semver x.y.z, se toma como versión objetivo
  // - Lo restante se toma como lista de cambios si no se pasaron con flags
  if (!args.version && args.positionals.length > 0) {
    const maybeVersion = args.positionals[0];
    if (/^\d+\.\d+\.\d+$/.test(maybeVersion)) {
      args.version = maybeVersion;
      args.positionals = args.positionals.slice(1);
    }
  }

  if (args.changes.length === 0 && args.positionals.length > 0) {
    args.changes = [...args.positionals];
  }

  return args;
}

function bumpPatch(version) {
  const m = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version);
  if (!m) throw new Error(`Versión inválida: ${version}`);
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  return `${major}.${minor}.${patch + 1}`;
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeText(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
}

function replaceOrThrow(haystack, pattern, replacement, label) {
  if (!pattern.test(haystack)) {
    throw new Error(`No pude actualizar ${label} (pattern no matcheó).`);
  }
  // Puede ser idempotente (reemplazo produce el mismo texto) y eso está OK.
  return haystack.replace(pattern, replacement);
}

function escapeTsString(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function main() {
  const { version: forcedVersion, changes, date } = parseArgs(process.argv.slice(2));

  // package.json (fuente de verdad para el bump)
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const pkgRaw = await readText(packageJsonPath);
  const pkg = JSON.parse(pkgRaw);
  const currentVersion = pkg.version;
  const nextVersion = forcedVersion || bumpPatch(currentVersion);

  if (!/^\d+\.\d+\.\d+$/.test(nextVersion)) {
    throw new Error(`Versión inválida: ${nextVersion}. Usa formato x.y.z`);
  }

  // 1) package.json
  // Puede ser idempotente (p.ej. si un bump anterior quedó a medias). Aun así sincronizamos el resto.
  pkg.version = nextVersion;
  await writeText(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

  // 2) src/version.ts (APP_VERSION + VERSION_HISTORY arriba)
  const versionTsPath = path.join(repoRoot, 'src', 'version.ts');
  let versionTs = await readText(versionTsPath);

  versionTs = replaceOrThrow(
    versionTs,
    /export const APP_VERSION = '([^']+)';/,
    `export const APP_VERSION = '${nextVersion}';`,
    'APP_VERSION en src/version.ts'
  );

  // Insertar SIEMPRE la versión más nueva ARRIBA (inicio del array), evitando duplicados
  const alreadyHasEntry = versionTs.includes(`version: '${nextVersion}'`);
  if (!alreadyHasEntry) {
    const changeLines = (changes.length > 0 ? changes : ['Actualización']).map(c => `      '${escapeTsString(c)}'`);
    const newEntry = [
      '  {',
      `    version: '${nextVersion}',`,
      `    date: '${date}',`,
      '    changes: [',
      changeLines.join(',\n'),
      '    ]',
      '  },',
    ].join('\n');

    const historyAnchorRe = /export const VERSION_HISTORY = \[\s*\r?\n/;
    const match = historyAnchorRe.exec(versionTs);
    if (!match || match.index == null) throw new Error('No encontré VERSION_HISTORY en src/version.ts');
    const insertAt = match.index + match[0].length;
    versionTs = versionTs.slice(0, insertAt) + newEntry + '\n' + versionTs.slice(insertAt);
  }

  await writeText(versionTsPath, versionTs);

  // 3) index.html (labels PC/OG)
  const indexHtmlPath = path.join(repoRoot, 'index.html');
  let indexHtml = await readText(indexHtmlPath);

  indexHtml = replaceOrThrow(
    indexHtml,
    /(<meta name="application-name" content="Repuestos - App v)([^"]+)("\s*\/?>)/,
    `$1${nextVersion}$3`,
    'meta application-name en index.html'
  );
  indexHtml = replaceOrThrow(
    indexHtml,
    /(<meta name="apple-mobile-web-app-title" content="Repuestos - App v)([^"]+)("\s*\/?>)/,
    `$1${nextVersion}$3`,
    'meta apple-mobile-web-app-title en index.html'
  );
  indexHtml = replaceOrThrow(
    indexHtml,
    /(<meta property="og:title" content="Repuestos - App v)([^"]+)("\s*\/?>)/,
    `$1${nextVersion}$3`,
    'meta og:title en index.html'
  );
  indexHtml = replaceOrThrow(
    indexHtml,
    /(<title>Repuestos - App v)([^<]+)(<\/title>)/,
    `$1${nextVersion}$3`,
    'title en index.html'
  );

  await writeText(indexHtmlPath, indexHtml);

  // 4) vite.config.ts (manifest PWA)
  const viteConfigPath = path.join(repoRoot, 'vite.config.ts');
  let viteConfig = await readText(viteConfigPath);

  viteConfig = replaceOrThrow(
    viteConfig,
    /(name:\s*'Repuestos - App v)([^']+)(')/,
    `$1${nextVersion}$3`,
    'manifest.name en vite.config.ts'
  );
  viteConfig = replaceOrThrow(
    viteConfig,
    /(short_name:\s*'Repuestos v)([^']+)(')/,
    `$1${nextVersion}$3`,
    'manifest.short_name en vite.config.ts'
  );

  await writeText(viteConfigPath, viteConfig);

  console.log(`✅ Versión actualizada: ${currentVersion} → ${nextVersion}`);
  console.log('✅ Actualizado: package.json, src/version.ts (graph), index.html (labels), vite.config.ts (PWA)');
}

main().catch((err) => {
  console.error('❌ Error bump-version:', err?.message || err);
  process.exit(1);
});
