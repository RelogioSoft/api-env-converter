import { parseBrunoEnvironment, toBrunoEnvironment } from './bruno';
import { parsePostmanEnvironment, toPostmanEnvironment } from './postman';
import type { EnvironmentFormat, NormalizedEnvironment } from './types';
import { parseVaultFlatJson, toVaultFlatJson } from './vaultJson';

export const FORMAT_LABELS: Record<EnvironmentFormat, string> = {
  postman: 'Postman Environment JSON',
  bruno: 'Bruno Environment',
  'vault-flat': 'Vault JSON - flat',
};

export function parseEnvironment(
  format: EnvironmentFormat,
  input: string,
): NormalizedEnvironment {
  switch (format) {
    case 'postman':
      return parsePostmanEnvironment(input);
    case 'bruno':
      return parseBrunoEnvironment(input);
    case 'vault-flat':
      return parseVaultFlatJson(input);
  }
}

export function serializeEnvironment(
  format: EnvironmentFormat,
  env: NormalizedEnvironment,
  envName?: string,
): string {
  switch (format) {
    case 'postman':
      return toPostmanEnvironment(env, envName);
    case 'bruno':
      return toBrunoEnvironment(env);
    case 'vault-flat':
      return toVaultFlatJson(env);
  }
}

export function convertEnvironment(
  inputFormat: EnvironmentFormat,
  outputFormat: EnvironmentFormat,
  input: string,
  envName?: string,
): string {
  const normalized = parseEnvironment(inputFormat, input);
  return serializeEnvironment(outputFormat, normalized, envName);
}

export function getDownloadFileName(
  format: EnvironmentFormat,
  environmentName: string,
): string {
  const safeName = environmentName.trim() || 'environment';

  switch (format) {
    case 'postman':
      return `${safeName}.postman_environment.json`;
    case 'bruno':
      return `${safeName}.bru`;
    case 'vault-flat':
      return `${safeName}.vault.json`;
  }
}
