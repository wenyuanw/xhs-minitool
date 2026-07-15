import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)));
export const VALIDATE_SCRIPT = join(PKG_ROOT, 'scripts', 'validate_xhs_tool.py');

/**
 * 对目录运行小红书小工具静态校验。
 * @param {string} targetDir
 * @param {{ strict?: boolean, json?: boolean, python?: string }} [options]
 * @returns {number} exit code
 */
export function validateMinitool(targetDir, options = {}) {
  const { strict = false, json = false, python = 'python3' } = options;

  if (!existsSync(VALIDATE_SCRIPT)) {
    console.error(`validate script not found: ${VALIDATE_SCRIPT}`);
    return 1;
  }
  if (!existsSync(targetDir)) {
    console.error(`target directory not found: ${targetDir}`);
    return 1;
  }

  const args = [VALIDATE_SCRIPT, targetDir];
  if (strict) args.push('--strict');
  if (json) args.push('--json');

  const result = spawnSync(python, args, {
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  return result.status ?? 1;
}
