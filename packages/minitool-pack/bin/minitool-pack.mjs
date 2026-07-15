#!/usr/bin/env node
import { packMinitool } from '../index.js';

const raw = process.argv.slice(2);
const flags = new Set(raw.filter((a) => a.startsWith('-')));

if (flags.has('--help') || flags.has('-h')) {
  console.log(`Usage: minitool-pack [--out-dir <dir>] [--zip <name>] [--skip-validate]

Package vite xhs-tool output into a Xiaohongshu-compliant zip.`);
  process.exit(0);
}

function getFlagValue(name) {
  const idx = raw.indexOf(name);
  if (idx === -1) return undefined;
  return raw[idx + 1];
}

try {
  const code = packMinitool({
    outDir: getFlagValue('--out-dir'),
    zipName: getFlagValue('--zip'),
    skipValidate: flags.has('--skip-validate'),
    strict: !flags.has('--no-strict'),
  });
  process.exit(code ?? 0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
