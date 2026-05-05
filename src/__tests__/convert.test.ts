import { describe, expect, it } from 'vitest';
import { convertEnvironment, getDownloadFileName } from '../converters/convert';

const postmanInput = JSON.stringify({
  name: 'local',
  values: [
    {
      key: 'baseUrl',
      value: 'https://api.example.com',
      type: 'default',
      enabled: true,
    },
    { key: 'clientSecret', value: 'my-secret', type: 'secret', enabled: true },
  ],
});

const brunoInput = `
vars {
  baseUrl: https://api.example.com
  clientSecret: my-secret
}
`;

describe('end-to-end conversion', () => {
  it('converts Postman to Bruno', () => {
    expect(convertEnvironment('postman', 'bruno', postmanInput)).toBe(
      [
        'vars {',
        '  baseUrl: https://api.example.com',
        '  clientSecret: my-secret',
        '}',
        '',
        'vars:secret [',
        '  clientSecret',
        ']',
      ].join('\n'),
    );
  });

  it('converts Bruno to Postman', () => {
    const output = JSON.parse(convertEnvironment('bruno', 'postman', brunoInput, 'local'));

    expect(output.name).toBe('local');
    expect(output.values).toEqual([
      {
        key: 'baseUrl',
        value: 'https://api.example.com',
        type: 'default',
        enabled: true,
      },
      {
        key: 'clientSecret',
        value: 'my-secret',
        type: 'default',
        enabled: true,
      },
    ]);
  });

  it('converts Vault flat to Bruno', () => {
    expect(
      convertEnvironment(
        'vault-flat',
        'bruno',
        JSON.stringify({ baseUrl: 'https://api.example.com', apiKey: 'fake-key' }),
      ),
    ).toBe(
      [
        'vars {',
        '  baseUrl: https://api.example.com',
        '  apiKey: fake-key',
        '}',
        '',
        'vars:secret [',
        '  apiKey',
        ']',
      ].join('\n'),
    );
  });

  it('converts Bruno to Vault flat', () => {
    expect(JSON.parse(convertEnvironment('bruno', 'vault-flat', brunoInput))).toEqual({
      baseUrl: 'https://api.example.com',
      clientSecret: 'my-secret',
    });
  });

  it('builds download filenames for every supported format', () => {
    expect(getDownloadFileName('postman', 'local')).toBe(
      'local.postman_environment.json',
    );
    expect(getDownloadFileName('bruno', 'local')).toBe('local.bru');
    expect(getDownloadFileName('vault-flat', 'local')).toBe('local.vault.json');
    expect(getDownloadFileName('bruno', '')).toBe('environment.bru');
  });
});
