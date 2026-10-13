import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMinitoolConfig } from 'xhs-minitool-vite-config';

const root = path.dirname(fileURLToPath(import.meta.url));

function inlineSamples() {
  const id = '\0virtual:samples';
  return {
    name: 'inline-samples',
    resolveId(source) {
      if (source === 'virtual:samples') return id;
    },
    load(source) {
      if (source !== id) return null;
      const dir = path.join(root, 'src/samples');
      const files = fs.readdirSync(dir).filter((name) => name.endsWith('.jpg')).sort();
      const values = files.map((name) => {
        const safe = fs.readFileSync(path.join(dir, name))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/g, '');
        return JSON.stringify(safe);
      });
      return `export default [${values.join(',')}];`;
    },
  };
}

export default defineMinitoolConfig({
  plugins: [inlineSamples()],
  build: {
    target: 'es2017',
  },
});
