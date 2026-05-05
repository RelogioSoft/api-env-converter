import type { NormalizedEnvironment, NormalizedVariable } from './types';

export function normalizeVariables(
  variables: NormalizedVariable[],
  name?: string,
): NormalizedEnvironment {
  return {
    name,
    variables: variables
      .filter((variable) => variable.key.trim().length > 0)
      .map((variable) => ({
        key: variable.key.trim(),
        value: String(variable.value ?? ''),
        enabled: variable.enabled ?? true,
        secret: variable.secret ?? false,
      })),
  };
}

export function isSecretKey(key: string): boolean {
  return /(secret|password|token|clientSecret|privateKey|apiKey)/i.test(key);
}
