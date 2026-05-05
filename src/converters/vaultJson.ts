import { isSecretKey, normalizeVariables } from './normalizer';
import { ConversionError, type NormalizedEnvironment } from './types';

type JsonObject = Record<string, unknown>;

export function parseVaultFlatJson(input: string): NormalizedEnvironment {
  const parsed = parseJsonObject(input, 'Vault flat JSON');

  const variables = Object.entries(parsed).map(([key, value]) => ({
    key,
    value: stringifyVaultValue(value),
    enabled: true,
    secret: isSecretKey(key),
  }));

  return normalizeVariables(variables);
}

export function toVaultFlatJson(env: NormalizedEnvironment): string {
  const output = Object.fromEntries(
    env.variables.map((variable) => [variable.key, variable.value]),
  );

  return JSON.stringify(output, null, 2);
}

function parseJsonObject(input: string, label: string): JsonObject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new ConversionError(`${label} must be valid JSON.`);
  }

  if (!isPlainObject(parsed)) {
    throw new ConversionError(`${label} must be a JSON object.`);
  }

  return parsed;
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringifyVaultValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}
