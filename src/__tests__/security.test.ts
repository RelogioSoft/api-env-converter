import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN_PATTERNS = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bnavigator\.sendBeacon\b/,
  /\bconsole\.log\b/,
];

describe('security constraints', () => {
  it('does not add network, storage, telemetry, or secret logging APIs in runtime source', () => {
    const files = listSourceFiles(join(process.cwd(), 'src'));

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(source, `${file} must not contain ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      if (entry === '__tests__' || entry === 'test') {
        return [];
      }

      return listSourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}
