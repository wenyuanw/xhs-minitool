#!/usr/bin/env node
/**
 * 四包同版本发版脚本：bump → CHANGELOG →（可选）commit/tag →（可选）npm publish
 *
 * 用法：
 *   pnpm release prepare patch -m "说明"
 *   pnpm release prepare minor -m "说明" --commit --tag
 *   pnpm release publish
 *   pnpm release publish --otp=123456
 *   pnpm release patch -m "说明" --commit --tag --publish
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');

const PACKAGE_DIRS = [
  'packages/create-minitool',
  'packages/minitool-vite-config',
  'packages/minitool-validate',
  'packages/minitool-pack',
];

const PUBLISH_ORDER = [
  'xhs-minitool-vite-config',
  'xhs-minitool-validate',
  'xhs-minitool-pack',
  'create-xhs-minitool',
];

function parseArgs(argv) {
  const args = [...argv];
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '-m' || a === '--message') {
      flags.message = args[++i];
      continue;
    }
    if (a.startsWith('--otp=')) {
      flags.otp = a.slice('--otp='.length);
      continue;
    }
    if (a === '--otp') {
      flags.otp = args[++i];
      continue;
    }
    if (a.startsWith('--')) {
      flags[a.slice(2)] = true;
      continue;
    }
    if (a.startsWith('-')) {
      flags[a.slice(1)] = true;
      continue;
    }
    positional.push(a);
  }
  return { flags, positional };
}

function bumpSemver(version, type) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-.*)?$/);
  if (!m) throw new Error(`无效版本号: ${version}`);
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else if (type === 'patch') {
    patch += 1;
  } else {
    throw new Error(`未知 bump 类型: ${type}（可用 patch|minor|major）`);
  }
  return `${major}.${minor}.${patch}`;
}

function readPkg(dir) {
  return JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
}

function writePkg(dir, pkg) {
  writeFileSync(join(ROOT, dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
}

function getCurrentVersion() {
  const versions = PACKAGE_DIRS.map((dir) => readPkg(dir).version);
  if (new Set(versions).size !== 1) {
    throw new Error(`四个包版本不一致：${versions.join(', ')}。请先对齐后再发版。`);
  }
  return versions[0];
}

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function bumpHeading(type) {
  if (type === 'major') return 'Major Changes';
  if (type === 'minor') return 'Minor Changes';
  return 'Patch Changes';
}

function updateChangelog(nextVersion, type, message) {
  const entry = `## ${nextVersion} - ${today()}

### ${bumpHeading(type)}

- ${message}
`;

  let existing = '';
  if (existsSync(CHANGELOG)) {
    existing = readFileSync(CHANGELOG, 'utf8');
  } else {
    existing = `# Changelog

All notable changes to \`create-xhs-minitool\` and related packages will be documented in this file.
`;
  }

  if (/^# Changelog/m.test(existing)) {
    existing = existing.replace(/^# Changelog[^\n]*\n+/, (h) => `${h.trimEnd()}\n\n${entry}`);
  } else {
    existing = `# Changelog\n\n${entry}\n${existing}`;
  }
  writeFileSync(CHANGELOG, existing.endsWith('\n') ? existing : `${existing}\n`);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf8',
    ...opts,
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`命令失败: ${cmd} ${args.join(' ')}`);
  }
}

function prepare(type, flags) {
  const message = flags.message?.trim();
  if (!message) {
    throw new Error('请用 -m "说明" 写清本版变更（会写入 CHANGELOG）。');
  }

  const current = getCurrentVersion();
  const next = bumpSemver(current, type);
  console.log(`版本：${current} → ${next} (${type})`);

  for (const dir of PACKAGE_DIRS) {
    const pkg = readPkg(dir);
    pkg.version = next;
    writePkg(dir, pkg);
    console.log(`  updated ${pkg.name}@${next}`);
  }

  updateChangelog(next, type, message);
  console.log('  updated CHANGELOG.md');

  if (flags.commit) {
    run('git', ['add', 'CHANGELOG.md', ...PACKAGE_DIRS.map((d) => `${d}/package.json`)]);
    run('git', ['commit', '-m', `Release ${next}`]);
    console.log(`  committed: Release ${next}`);
  }

  if (flags.tag) {
    if (!flags.commit) {
      throw new Error('--tag 需要同时传 --commit');
    }
    run('git', ['tag', `v${next}`]);
    console.log(`  tagged: v${next}`);
  }

  console.log(`
下一步：
  git push && git push --tags     # 若已 --commit/--tag
  pnpm release publish            # 发布到 npm
`);
  return next;
}

function publish(flags) {
  const version = getCurrentVersion();
  console.log(`发布全部包 @${version}`);
  run('pnpm', ['release:check']);

  for (const name of PUBLISH_ORDER) {
    const args = ['--filter', name, 'publish', '--access', 'public', '--no-git-checks'];
    if (flags.otp) args.push(`--otp=${flags.otp}`);
    console.log(`\n→ pnpm ${args.join(' ')}`);
    run('pnpm', args);
  }

  console.log(`
全部发布完成：
  npm view create-xhs-minitool version
  npx create-xhs-minitool@${version} --help
`);
}

function help() {
  console.log(`Usage:
  pnpm release prepare <patch|minor|major> -m "变更说明" [--commit] [--tag]
  pnpm release publish [--otp=xxxxxx]
  pnpm release <patch|minor|major> -m "变更说明" [--commit] [--tag] [--publish] [--otp=xxxxxx]

例子：
  pnpm release prepare patch -m "Fix phone preview height" --commit --tag
  pnpm release publish --otp=123456
  pnpm release patch -m "Fix phone preview height" --commit --tag --publish
`);
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags.help || flags.h) {
    help();
    process.exit(0);
  }
  if (positional.length === 0) {
    help();
    process.exit(1);
  }

  const [cmd, maybeType] = positional;

  if (cmd === 'prepare') {
    prepare(maybeType, flags);
    if (flags.publish) publish(flags);
    return;
  }

  if (cmd === 'publish') {
    publish(flags);
    return;
  }

  if (['patch', 'minor', 'major'].includes(cmd)) {
    prepare(cmd, flags);
    if (flags.publish) publish(flags);
    return;
  }

  help();
  throw new Error(`未知命令: ${cmd}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
