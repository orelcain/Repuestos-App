import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

function extractFromIndexHtml(html) {
  const patterns = [
    /<meta name="application-name" content="Repuestos - App v([0-9]+\.[0-9]+\.[0-9]+)"/,
    /<meta name="apple-mobile-web-app-title" content="Repuestos - App v([0-9]+\.[0-9]+\.[0-9]+)"/,
    /<meta property="og:title" content="Repuestos - App v([0-9]+\.[0-9]+\.[0-9]+)"/,
    /<title>Repuestos - App v([0-9]+\.[0-9]+\.[0-9]+)<\/title>/,
  ];

  const found = [];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) found.push(m[1]);
  }
  return found;
}

function extractFromViteConfig(ts) {
  const patterns = [
    /name:\s*'Repuestos - App v([0-9]+\.[0-9]+\.[0-9]+)'/,
    /short_name:\s*'Repuestos v([0-9]+\.[0-9]+\.[0-9]+)'/,
  ];

  const found = [];
  for (const re of patterns) {
    const m = re.exec(ts);
    if (m?.[1]) found.push(m[1]);
  }
  return found;
}

function extractAppVersionFromVersionTs(ts) {
  const m = /export const APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';/.exec(ts);
  return m?.[1] || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function main() {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const versionTsPath = path.join(repoRoot, 'src', 'version.ts');
  const indexHtmlPath = path.join(repoRoot, 'index.html');
  const viteConfigPath = path.join(repoRoot, 'vite.config.ts');

  const pkgRaw = await readText(packageJsonPath);
  const pkg = JSON.parse(pkgRaw);
  const pkgVersion = pkg.version;

  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(pkgVersion)) {
    throw new Error(`package.json version inválida: ${pkgVersion}`);
  }

  const versionTs = await readText(versionTsPath);
  const appVersion = extractAppVersionFromVersionTs(versionTs);

  const indexHtml = await readText(indexHtmlPath);
  const htmlVersions = extractFromIndexHtml(indexHtml);

  const viteConfig = await readText(viteConfigPath);
  const pwaVersions = extractFromViteConfig(viteConfig);

  const report = {
    'package.json': pkgVersion,
    'src/version.ts APP_VERSION': appVersion,
    'index.html': unique(htmlVersions),
    'vite.config.ts PWA': unique(pwaVersions),
  };

  const mismatches = [];

  if (appVersion !== pkgVersion) {
    mismatches.push(`APP_VERSION (${appVersion}) != package.json (${pkgVersion})`);
  }

  for (const v of unique(htmlVersions)) {
    if (v !== pkgVersion) mismatches.push(`index.html contiene ${v} != package.json (${pkgVersion})`);
  }

  for (const v of unique(pwaVersions)) {
    if (v !== pkgVersion) mismatches.push(`vite.config.ts contiene ${v} != package.json (${pkgVersion})`);
  }

  // Si no encontramos versiones en HTML/PWA, eso es un problema (se rompió el patrón)
  if (unique(htmlVersions).length === 0) {
    mismatches.push('index.html: no pude extraer versión (cambió el patrón)');
  }
  if (unique(pwaVersions).length === 0) {
    mismatches.push('vite.config.ts: no pude extraer versión (cambió el patrón)');
  }

  if (mismatches.length > 0) {
    console.error('❌ Versiones desincronizadas. Detalle:');
    console.error(JSON.stringify(report, null, 2));
    for (const m of mismatches) console.error(`- ${m}`);
    process.exit(1);
  }

  console.log(`✅ Versiones sincronizadas: v${pkgVersion}`);
}

main().catch((err) => {
  console.error('❌ Error check-version-sync:', err?.message || err);
  process.exit(1);
});
