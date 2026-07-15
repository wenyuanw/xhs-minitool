#!/usr/bin/env node
/**
 * 将各 app 的 xhs-tool 拷贝到 public/preview/<name>，并刷新 src/data/demos.json
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(ROOT, '../..');
const APPS = join(REPO, 'apps');
const PUBLIC_PREVIEW = join(ROOT, 'public', 'preview');
const DATA_FILE = join(ROOT, 'src', 'data', 'demos.json');

const SKIP = new Set(['website']);

function readPkg(dir) {
  const path = join(dir, 'package.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  if (existsSync(PUBLIC_PREVIEW)) {
    rmSync(PUBLIC_PREVIEW, { recursive: true, force: true });
  }
  mkdirSync(PUBLIC_PREVIEW, { recursive: true });
  mkdirSync(dirname(DATA_FILE), { recursive: true });

  const demos = [];

  for (const name of readdirSync(APPS)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const appDir = join(APPS, name);
    if (!statSync(appDir).isDirectory()) continue;

    const out = join(appDir, 'xhs-tool');
    if (!existsSync(join(out, 'index.html'))) {
      console.warn(`skip ${name}: missing xhs-tool/index.html (run pnpm --filter ${name} build)`);
      continue;
    }

    const pkg = readPkg(appDir) || {};
    const dest = join(PUBLIC_PREVIEW, name);
    cpSync(out, dest, { recursive: true });

    let title = pkg.name || name;
    try {
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      const m = html.match(/<title>([^<]*)<\/title>/i);
      if (m?.[1]?.trim()) title = m[1].trim();
    } catch {
      /* ignore */
    }

    demos.push({
      id: name,
      title,
      name: pkg.name || name,
      description: pkg.description || `${name} demo`,
      path: `/preview/${name}/index.html`,
    });

    console.log(`synced preview: ${name}`);
  }

  demos.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(DATA_FILE, `${JSON.stringify(demos, null, 2)}\n`);
  console.log(`wrote ${DATA_FILE} (${demos.length} demos)`);
}

main();
