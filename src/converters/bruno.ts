import { normalizeVariables } from './normalizer';
import { ConversionError, type NormalizedEnvironment } from './types';

export function parseBrunoEnvironment(input: string): NormalizedEnvironment {
  const body = findVarsBlockBody(input);

  if (body === undefined) {
    throw new ConversionError('Bruno environment must include a vars { ... } block.');
  }

  const secretKeys = findSecretKeys(input);

  const variables = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'))
    .map((line) => {
      const separatorIndex = line.indexOf(':');

      if (separatorIndex === -1) {
        throw new ConversionError(`Invalid Bruno variable line: "${line}". Expected key: value.`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();

      if (!key) {
        throw new ConversionError('Bruno variable keys cannot be empty.');
      }

      return {
        key,
        value: parseBrunoValue(rawValue),
        enabled: true,
        secret: secretKeys.has(key),
      };
    });

  return normalizeVariables(variables);
}

export function toBrunoEnvironment(env: NormalizedEnvironment): string {
  const lines = env.variables.map(
    (variable) => `  ${variable.key}: ${formatBrunoValue(variable.value)}`,
  );

  const secretKeys = env.variables.filter((v) => v.secret).map((v) => `  ${v.key}`);

  const parts = ['vars {', ...lines, '}'];

  if (secretKeys.length > 0) {
    parts.push('', 'vars:secret [', ...secretKeys, ']');
  }

  return parts.join('\n');
}

function parseBrunoValue(value: string): string {
  if (!value) {
    return '';
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0];
    const inner = value.slice(1, -1);
    return inner
      .replace(new RegExp(`\\\\${quote}`, 'g'), quote)
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n');
  }

  return value;
}

function formatBrunoValue(value: string): string {
  if (!/[{}\s"]/.test(value)) {
    return value;
  }

  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')}"`;
}

function findSecretKeys(input: string): Set<string> {
  const match = /vars:secret\s*\[([^\]]*)\]/s.exec(input);
  if (!match) return new Set();
  return new Set(
    match[1]
      .split(/[\r\n,\s]+/)
      .map((k) => k.trim())
      .filter(Boolean),
  );
}

function findVarsBlockBody(input: string): string | undefined {
  const varsMatch = /vars\s*\{/i.exec(input);

  if (!varsMatch) {
    return undefined;
  }

  const bodyStart = varsMatch.index + varsMatch[0].length;
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (let index = bodyStart; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && quote) {
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? undefined : char;
      continue;
    }

    if (char === '}' && !quote) {
      return input.slice(bodyStart, index);
    }
  }

  throw new ConversionError('Bruno vars block is missing a closing brace.');
}
