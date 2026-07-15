#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');
const TEMPLATE_DIR = join(PKG_ROOT, 'template');
const PKG_META = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function findRepoRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (
      existsSync(join(dir, 'pnpm-workspace.yaml')) &&
      existsSync(join(dir, 'package.json'))
    ) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        if (pkg.name === 'xiaohongshu-minitool') return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out;
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

async function ask(rl, question, defaultValue = '') {
  const hint = defaultValue ? ` (${defaultValue})` : '';
  const answer = (await rl.question(`${question}${hint}: `)).trim();
  return answer || defaultValue;
}

function applyPlaceholders(content, vars) {
  return content
    .replaceAll('{{name}}', vars.name)
    .replaceAll('{{title}}', vars.title)
    .replaceAll('{{description}}', vars.description)
    .replaceAll('{{slogan}}', vars.slogan)
    .replaceAll('{{themeColor}}', vars.themeColor)
    .replaceAll('{{depVersion}}', vars.depVersion);
}

function createProject(targetDir, vars) {
  if (existsSync(targetDir)) {
    throw new Error(`目标已存在：${targetDir}`);
  }
  if (!existsSync(TEMPLATE_DIR)) {
    throw new Error(`模板目录不存在: ${TEMPLATE_DIR}`);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(TEMPLATE_DIR, targetDir, { recursive: true });

  for (const file of walkFiles(targetDir)) {
    if (/\.(png|jpe?g|gif|webp|woff2?|ico)$/i.test(file)) continue;
    const raw = readFileSync(file, 'utf8');
    const next = applyPlaceholders(raw, vars);
    if (next !== raw) writeFileSync(file, next);
  }

  return targetDir;
}

function printHelp() {
  console.log(`Usage:
  npx create-xhs-minitool
  create-xhs-minitool --name <kebab> --title <str> [--slogan <str>] [--description <str>] [--theme-color #RRGGBB]

Inside the xiaohongshu-minitool monorepo, creates apps/<name>.
Elsewhere (npx), creates a standalone project directory.`);
}

async function collectVars(flags) {
  if (flags.help || flags.h) {
    printHelp();
    process.exit(0);
  }

  if (flags.name) {
    const name = String(flags.name);
    const title = String(flags.title || name);
    return {
      name,
      title,
      slogan: String(flags.slogan || `${title} —— 离线小工具`),
      description: String(flags.description || flags.slogan || `${title} —— 离线小工具`),
      themeColor: String(flags['theme-color'] || '#FF2442'),
    };
  }

  const rl = createInterface({ input, output, terminal: Boolean(input.isTTY) });
  try {
    console.log('创建小红书小工具（Vite + 原生 JS）\n');

    let name = await ask(rl, '工具目录名 (kebab-case)', 'my-minitool');
    while (!NAME_RE.test(name)) {
      console.log('名称须为 kebab-case，例如: note-helper');
      name = await ask(rl, '工具目录名 (kebab-case)');
    }

    const title = await ask(rl, '显示名称', name);
    const slogan = await ask(rl, 'Slogan', `${title} —— 离线小工具`);
    const description = await ask(rl, '描述', slogan);
    const themeColor = await ask(rl, 'theme-color', '#FF2442');

    return { name, title, slogan, description, themeColor };
  } finally {
    rl.close();
  }
}

async function main() {
  const repoRoot = findRepoRoot();
  const mode = repoRoot ? 'workspace' : 'standalone';
  const vars = await collectVars(parseArgs(process.argv.slice(2)));

  if (!NAME_RE.test(vars.name)) {
    throw new Error('名称须为 kebab-case，例如: note-helper');
  }
  if (!COLOR_RE.test(vars.themeColor)) {
    throw new Error('theme-color 须为 #RRGGBB');
  }

  vars.depVersion = mode === 'workspace' ? 'workspace:*' : `^${PKG_META.version || '0.1.0'}`;

  const target =
    mode === 'workspace'
      ? join(repoRoot, 'apps', vars.name)
      : join(process.cwd(), vars.name);

  createProject(target, vars);

  if (mode === 'workspace') {
    console.log(`\n已创建（monorepo）：${relative(repoRoot, target)}`);
    console.log(`
下一步：
  pnpm install
  pnpm --filter ${vars.name} dev
  pnpm --filter ${vars.name} build
`);
  } else {
    console.log(`\n已创建（独立项目）：${target}`);
    console.log(`
下一步：
  cd ${vars.name}
  pnpm install   # 或 npm install / yarn
  pnpm dev
  pnpm build
`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
