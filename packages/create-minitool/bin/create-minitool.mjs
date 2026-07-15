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

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function findRepoRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (
      existsSync(join(dir, 'pnpm-workspace.yaml')) &&
      existsSync(join(dir, 'package.json'))
    ) {
      return dir;
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
    .replaceAll('{{themeColor}}', vars.themeColor);
}

function createApp(repoRoot, vars) {
  const target = join(repoRoot, 'apps', vars.name);
  if (existsSync(target)) {
    throw new Error(`apps/${vars.name} 已存在`);
  }
  if (!existsSync(TEMPLATE_DIR)) {
    throw new Error(`模板目录不存在: ${TEMPLATE_DIR}`);
  }

  mkdirSync(target, { recursive: true });
  cpSync(TEMPLATE_DIR, target, { recursive: true });

  for (const file of walkFiles(target)) {
    if (/\.(png|jpe?g|gif|webp|woff2?|ico)$/i.test(file)) continue;
    const raw = readFileSync(file, 'utf8');
    const next = applyPlaceholders(raw, vars);
    if (next !== raw) writeFileSync(file, next);
  }

  return target;
}

function printHelp() {
  console.log(`Usage:
  pnpm create-minitool
  create-minitool --name <kebab> --title <str> [--slogan <str>] [--description <str>] [--theme-color #RRGGBB]

Interactive by default. Pass flags to skip prompts.`);
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

  const rl = createInterface({ input, output, terminal: false });
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
  if (!repoRoot) {
    console.error('请在本 monorepo 内运行（需包含 pnpm-workspace.yaml）。');
    process.exit(1);
  }

  const vars = await collectVars(parseArgs(process.argv.slice(2)));

  if (!NAME_RE.test(vars.name)) {
    throw new Error('名称须为 kebab-case，例如: note-helper');
  }
  if (!COLOR_RE.test(vars.themeColor)) {
    throw new Error('theme-color 须为 #RRGGBB');
  }

  const target = createApp(repoRoot, vars);

  console.log(`\n已创建：${relative(repoRoot, target)}`);
  console.log(`
下一步：
  pnpm install
  pnpm --filter ${vars.name} dev
  pnpm --filter ${vars.name} build
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
