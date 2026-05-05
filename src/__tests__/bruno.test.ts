import { describe, expect, it } from 'vitest';
import { parseBrunoEnvironment, toBrunoEnvironment } from '../converters/bruno';

describe('Bruno conversion', () => {
  it('parses Bruno vars blocks into normalized variables', () => {
    const normalized = parseBrunoEnvironment(`
      vars {
        # comment
        baseUrl: "https://api.example.com"
        clientId: my-client
        password: "some value with spaces"
        template: "hello {name}"
      }
    `);

    expect(normalized.variables).toEqual([
      {
        key: 'baseUrl',
        value: 'https://api.example.com',
        enabled: true,
        secret: false,
      },
      { key: 'clientId', value: 'my-client', enabled: true, secret: false },
      {
        key: 'password',
        value: 'some value with spaces',
        enabled: true,
        secret: false,
      },
      { key: 'template', value: 'hello {name}', enabled: true, secret: false },
    ]);
  });

  it('serializes normalized environments to Bruno vars blocks', () => {
    expect(
      toBrunoEnvironment({
        variables: [
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'password', value: 'some value with spaces' },
          { key: 'quoted', value: 'say "hello"' },
        ],
      }),
    ).toBe(
      ['vars {', '  baseUrl: https://api.example.com', '  password: "some value with spaces"', '  quoted: "say \\"hello\\""', '}'].join(
        '\n',
      ),
    );
  });

  it('parses and serializes Bruno secret variables', () => {
    const normalized = parseBrunoEnvironment(
      [
        'vars {',
        '  baseUrl: https://api.example.com',
        '  clientSecret: fake-secret',
        '}',
        '',
        'vars:secret [',
        '  clientSecret',
        ']',
      ].join('\n'),
    );

    expect(normalized.variables).toEqual([
      {
        key: 'baseUrl',
        value: 'https://api.example.com',
        enabled: true,
        secret: false,
      },
      { key: 'clientSecret', value: 'fake-secret', enabled: true, secret: true },
    ]);

    expect(toBrunoEnvironment(normalized)).toBe(
      [
        'vars {',
        '  baseUrl: https://api.example.com',
        '  clientSecret: fake-secret',
        '}',
        '',
        'vars:secret [',
        '  clientSecret',
        ']',
      ].join('\n'),
    );
  });

  it('handles quoted values with escaped quotes and braces', () => {
    const normalized = parseBrunoEnvironment(
      ['vars {', '  message: "say \\"hello\\" to {name}"', '}'].join('\n'),
    );

    expect(normalized.variables[0]).toMatchObject({
      key: 'message',
      value: 'say "hello" to {name}',
    });
  });

  it('returns clear errors for invalid Bruno input', () => {
    expect(() => parseBrunoEnvironment('baseUrl: nope')).toThrow(
      'Bruno environment must include a vars { ... } block.',
    );
    expect(() => parseBrunoEnvironment('vars {')).toThrow(
      'Bruno vars block is missing a closing brace.',
    );
  });
});
