#!/usr/bin/env node
import { resolve } from 'node:path';
import { validateMinitool } from '../index.js';

const raw = process.argv.slice(2);
const flags = new Set(raw.filter((a) => a.startsWith('-')));
const positional = raw.filter((a) => !a.startsWith('-'));

if (positional.length === 0 || flags.has('--help') || flags.has('-h')) {
  console.log(`Usage: minitool-validate <dir> [--strict] [--json]

Run Xiaohongshu mini-tool static compatibility checks.`);
  process.exit(positional.length === 0 ? 1 : 0);
}

const target = resolve(process.cwd(), positional[0]);
const code = validateMinitool(target, {
  strict: flags.has('--strict'),
  json: flags.has('--json'),
});
process.exit(code);
