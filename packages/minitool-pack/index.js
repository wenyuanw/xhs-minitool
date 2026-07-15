#!/usr/bin/env node
/**
 * 整理小红书小工具最终提交包：
 * - 去掉构建残留与不允许的文件类型
 * - 校正 HTML 资源为相对路径、非 module 脚本
 * - 将脚本移到 body 末尾（IIFE 依赖 DOM）
 * - 打出 zip（index.html 在 zip 根目录）
 * - 再跑一遍静态校验
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { validateMinitool } from '@xhs/minitool-validate';

const ALLOWED = new Set([
  '.html',
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.woff',
  '.woff2',
  '.json',
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function ensureAllowedOnly(outDir) {
  for (const file of walk(outDir)) {
    const ext = extname(file).toLowerCase();
    if (!ALLOWED.has(ext)) {
      rmSync(file, { force: true });
      console.log(`removed unsupported: ${relative(outDir, file)}`);
    }
  }
}

function patchIndexHtml(outDir) {
  const htmlPath = join(outDir, 'index.html');
  if (!existsSync(htmlPath)) {
    throw new Error(`${relative(process.cwd(), htmlPath)} 不存在，请先执行 vite build`);
  }

  let html = readFileSync(htmlPath, 'utf8');

  html = html.replace(/(href|src)="\/([^"]+)"/g, '$1="./$2"');
  html = html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');
  html = html.replace(/<link[^>]+rel="manifest"[^>]*>/gi, '');

  const scripts = [];
  html = html.replace(
    /<script(?:\s[^>]*)?\ssrc="(\.\/[^"]+)"(?:\s[^>]*)?>\s*<\/script>\s*/gi,
    (_m, src) => {
      scripts.push(`<script src="${src}"></script>`);
      return '';
    },
  );

  if (scripts.length) {
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `    ${scripts.join('\n    ')}\n  </body>`);
    } else {
      html += `\n${scripts.join('\n')}\n`;
    }
  }

  writeFileSync(htmlPath, html);
}

function pruneEmptyDirs(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      pruneEmptyDirs(path);
      if (readdirSync(path).length === 0) rmSync(path, { recursive: true, force: true });
    }
  }
}

function makeZip(outDir, zipPath) {
  if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  const result = spawnSync(
    'zip',
    ['-r', zipPath, '.', '-x', '*.DS_Store'],
    { cwd: outDir, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`zip 失败：${result.stderr || result.stdout || 'unknown'}`);
  }
  const list = spawnSync('zipinfo', ['-1', zipPath], { encoding: 'utf8' });
  const entries = (list.stdout || '').split('\n').filter(Boolean);
  if (!entries.includes('index.html')) {
    throw new Error('zip 根目录缺少 index.html（可能多套了一层目录）');
  }
  if (entries.some((e) => e === 'node_modules/' || e.endsWith('.map'))) {
    throw new Error('zip 内含禁止文件');
  }
  console.log(`zip 已生成：${zipPath}（${entries.length} 个条目）`);
}

function readPackageName(cwd) {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return 'minitool';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.name || 'minitool';
  } catch {
    return 'minitool';
  }
}

/**
 * @param {{
 *   cwd?: string,
 *   outDir?: string,
 *   zipName?: string,
 *   publicDir?: string,
 *   skipValidate?: boolean,
 *   strict?: boolean,
 * }} [options]
 */
export function packMinitool(options = {}) {
  const cwd = resolve(options.cwd || process.cwd());
  const outDir = resolve(cwd, options.outDir || 'xhs-tool');
  const zipName = options.zipName || `${readPackageName(cwd)}-xhs-tool.zip`;
  const zipPath = resolve(cwd, zipName);
  const publicDir = resolve(cwd, options.publicDir || 'public');
  const strict = options.strict !== false;

  if (!existsSync(outDir)) {
    throw new Error(`缺少输出目录 ${outDir}`);
  }

  for (const icon of ['icon-192.svg', 'icon-512.svg']) {
    const dest = join(outDir, 'icons', icon);
    const src = join(publicDir, 'icons', icon);
    if (!existsSync(dest) && existsSync(src)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    }
  }

  ensureAllowedOnly(outDir);
  pruneEmptyDirs(outDir);
  patchIndexHtml(outDir);
  makeZip(outDir, zipPath);

  console.log(`\n小红书小工具包已整理：${outDir}`);

  if (options.skipValidate) return 0;

  const code = validateMinitool(outDir, { strict });
  if (code !== 0) {
    process.exitCode = code;
  }
  return code;
}

export default packMinitool;
