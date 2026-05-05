import { describe, expect, it } from 'vitest';
import { parsePostmanEnvironment, toPostmanEnvironment } from '../converters/postman';

describe('Postman conversion', () => {
  it('parses Postman environments into normalized variables', () => {
    const normalized = parsePostmanEnvironment(
      JSON.stringify({
        name: 'local',
        values: [
          { key: 'baseUrl', value: 'https://api.example.com', type: 'default', enabled: true },
          { key: 'clientSecret', value: 'secret', type: 'secret', enabled: true },
          { key: 'disabled', value: 'nope', enabled: false },
        ],
      }),
    );

    expect(normalized).toEqual({
      name: 'local',
      variables: [
        {
          key: 'baseUrl',
          value: 'https://api.example.com',
          enabled: true,
          secret: false,
        },
        { key: 'clientSecret', value: 'secret', enabled: true, secret: true },
      ],
    });
  });

  it('serializes normalized environments to Postman JSON', () => {
    const output = JSON.parse(
      toPostmanEnvironment(
        {
          variables: [
            { key: 'baseUrl', value: 'https://api.example.com', secret: false },
            { key: 'clientSecret', value: 'secret', secret: true },
          ],
        },
        'local',
      ),
    );

    expect(output.name).toBe('local');
    expect(output.values).toEqual([
      {
        key: 'baseUrl',
        value: 'https://api.example.com',
        type: 'default',
        enabled: true,
      },
      { key: 'clientSecret', value: 'secret', type: 'secret', enabled: true },
    ]);
    expect(output._postman_variable_scope).toBe('environment');
    expect(output._postman_exported_using).toBe('credentials-converter');
    expect(output._postman_exported_at).toEqual(expect.any(String));
  });

  it('returns clear errors for invalid Postman input', () => {
    expect(() => parsePostmanEnvironment('{')).toThrow('Postman environment must be valid JSON.');
    expect(() => parsePostmanEnvironment('{}')).toThrow(
      'Postman environment JSON must include a values array.',
    );
  });

  it('supports missing name and missing variable type', () => {
    const normalized = parsePostmanEnvironment(
      JSON.stringify({
        values: [{ key: 'baseUrl', value: 'https://api.example.com', enabled: true }],
      }),
    );

    expect(normalized).toEqual({
      name: undefined,
      variables: [
        {
          key: 'baseUrl',
          value: 'https://api.example.com',
          enabled: true,
          secret: false,
        },
      ],
    });
  });
});
