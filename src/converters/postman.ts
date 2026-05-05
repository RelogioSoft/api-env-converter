import { normalizeVariables } from './normalizer';
import { ConversionError, type NormalizedEnvironment } from './types';

type PostmanValue = {
  key?: unknown;
  value?: unknown;
  type?: unknown;
  enabled?: unknown;
};

type PostmanEnvironment = {
  name?: unknown;
  values?: unknown;
};

export function parsePostmanEnvironment(
  input: string,
  options: { includeDisabled?: boolean } = {},
): NormalizedEnvironment {
  let parsed: PostmanEnvironment;

  try {
    parsed = JSON.parse(input) as PostmanEnvironment;
  } catch {
    throw new ConversionError('Postman environment must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.values)) {
    throw new ConversionError('Postman environment JSON must include a values array.');
  }

  const variables = (parsed.values as PostmanValue[])
    .filter((item) => item && typeof item === 'object')
    .filter((item) => options.includeDisabled || item.enabled !== false)
    .map((item) => ({
      key: String(item.key ?? ''),
      value: String(item.value ?? ''),
      enabled: item.enabled === undefined ? true : item.enabled !== false,
      secret: item.type === 'secret',
    }));

  return normalizeVariables(
    variables,
    typeof parsed.name === 'string' ? parsed.name : undefined,
  );
}

export function toPostmanEnvironment(
  env: NormalizedEnvironment,
  envName?: string,
): string {
  const name = envName?.trim() || env.name?.trim() || 'environment';
  const postman = {
    name,
    values: env.variables.map((variable) => ({
      key: variable.key,
      value: variable.value,
      type: variable.secret ? 'secret' : 'default',
      enabled: variable.enabled ?? true,
    })),
    _postman_variable_scope: 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'credentials-converter',
  };

  return JSON.stringify(postman, null, 2);
}
