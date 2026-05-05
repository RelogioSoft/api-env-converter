import { describe, expect, it } from 'vitest';
import { parseVaultFlatJson, toVaultFlatJson } from '../converters/vaultJson';

describe('Vault JSON conversion', () => {
  it('parses flat Vault-compatible JSON into normalized variables', () => {
    const normalized = parseVaultFlatJson(
      JSON.stringify({
        baseUrl: 'https://api.example.com',
        clientSecret: 'my-secret',
        retries: 3,
      }),
    );

    expect(normalized.variables).toEqual([
      {
        key: 'baseUrl',
        value: 'https://api.example.com',
        enabled: true,
        secret: false,
      },
      { key: 'clientSecret', value: 'my-secret', enabled: true, secret: true },
      { key: 'retries', value: '3', enabled: true, secret: false },
    ]);
  });

  it('stringifies primitive values and detects secret-like keys', () => {
    const normalized = parseVaultFlatJson(
      JSON.stringify({
        retries: 3,
        enabled: true,
        empty: null,
        apiKey: 'fake-key',
        privateKey: 'fake-private-key',
        accessToken: 'fake-token',
      }),
    );

    expect(normalized.variables).toEqual([
      { key: 'retries', value: '3', enabled: true, secret: false },
      { key: 'enabled', value: 'true', enabled: true, secret: false },
      { key: 'empty', value: '', enabled: true, secret: false },
      { key: 'apiKey', value: 'fake-key', enabled: true, secret: true },
      { key: 'privateKey', value: 'fake-private-key', enabled: true, secret: true },
      { key: 'accessToken', value: 'fake-token', enabled: true, secret: true },
    ]);
  });

  it('serializes normalized environments to flat Vault JSON', () => {
    expect(
      JSON.parse(
        toVaultFlatJson({
          variables: [
            { key: 'baseUrl', value: 'https://api.example.com' },
            { key: 'password', value: 'pass', secret: true },
          ],
        }),
      ),
    ).toEqual({
      baseUrl: 'https://api.example.com',
      password: 'pass',
    });
  });

  it('returns clear errors for invalid Vault input', () => {
    expect(() => parseVaultFlatJson('[]')).toThrow('Vault flat JSON must be a JSON object.');
  });
});
