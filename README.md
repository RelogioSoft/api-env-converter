# Credentials Converter

Credentials Converter is a static, browser-only web app for converting local environment and credential files between Postman, Bruno, and Vault-compatible flat JSON.

It is designed for manual, local conversion work: paste text, upload a file, convert, copy the result, or download a generated file. There is no backend and no direct integration with Postman, Bruno, or HashiCorp Vault.

## Supported Formats

- Postman Environment JSON
- Bruno Environment `.bru`
- Vault-compatible flat JSON

Vault grouped JSON is not supported.

## Supported Conversions

- Postman Environment JSON to Bruno Environment
- Bruno Environment to Postman Environment JSON
- Postman Environment JSON to Vault JSON - flat
- Vault JSON - flat to Postman Environment JSON
- Bruno Environment to Vault JSON - flat
- Vault JSON - flat to Bruno Environment

All conversions use an internal normalized model instead of direct one-off converter pairs.

## Security Model

All conversion happens locally in the browser.

Important guarantees:

- No backend exists.
- No data is uploaded.
- No external API calls are made by the app.
- No analytics or telemetry are included.
- Secrets are not written to `localStorage` or `sessionStorage`.
- Input and output are not logged with `console.log`.

Important user responsibilities:

- Do not use this tool on untrusted devices.
- Do not paste real secrets into a browser or machine you do not trust.
- Do not commit generated files containing real secrets.

The test suite includes a regression test that fails if runtime source code adds common network, storage, telemetry, or secret-logging APIs such as `fetch`, `XMLHttpRequest`, `localStorage`, `sessionStorage`, `navigator.sendBeacon`, or `console.log`.

## Not a Vault Client

This is not a HashiCorp Vault client.

The app does not connect to the HashiCorp Vault API, authenticate to Vault, read secrets from Vault, or write secrets to Vault. It only produces and reads flat JSON that can be useful in Vault-adjacent workflows.

## UI Features

- Source and target format selectors
- Swap source and target formats
- Built-in fake examples for every source format
- Paste area for source input
- File upload and drag-and-drop input
- Output preview
- Copy output
- Download output
- Detected variable list with secret indicators
- Friendly validation errors for invalid input

The `Output name` field is used for generated file names and for the Postman environment `name` when the target format is Postman.

Generated file names:

- Postman: `<output-name>.postman_environment.json`
- Bruno: `<output-name>.bru`
- Vault JSON: `<output-name>.vault.json`

If the output name is empty, `environment` is used.

## Format Notes

### Postman

The parser reads the `values` array from a Postman environment export.

Behavior:

- Disabled variables are ignored.
- `type: "secret"` becomes `secret: true`.
- `type: "default"` and missing `type` become `secret: false`.
- Missing environment `name` is supported.

Postman output:

- Pretty-printed with 2 spaces.
- Includes `name`.
- Includes `values`.
- Includes `_postman_variable_scope: "environment"`.
- Includes `_postman_exported_at`.
- Includes `_postman_exported_using: "credentials-converter"`.
- Uses `type: "secret"` for secret variables, otherwise `type: "default"`.
- Defaults `enabled` to `true`.

### Bruno

The parser reads a `vars { ... }` block.

Supported input:

- Simple `key: value` lines
- Double-quoted values
- Single-quoted values
- Escaped quotes
- Values with spaces
- Values with braces
- Empty lines
- `#` comments
- `//` comments
- Optional `vars:secret [ ... ]` block

Bruno output:

- Emits a `vars { ... }` block.
- Quotes values when needed.
- Escapes quotes and newlines.
- Emits `vars:secret [ ... ]` when normalized variables are marked as secret.

### Vault JSON - Flat

The parser reads top-level key-value pairs from a JSON object.

Behavior:

- All values are converted to strings.
- `null` and `undefined` become an empty string.
- Secret detection is based on key names.

Keys are marked as secret when they match these case-insensitive patterns:

- `secret`
- `password`
- `token`
- `clientSecret`
- `privateKey`
- `apiKey`

Vault output:

- Pretty-printed with 2 spaces.
- Emits all variables as top-level JSON fields.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Run the test suite:

```bash
npm run test
```

Build the production-ready static app into `dist`:

```bash
npm run build
```

Preview the built `dist` app locally:

```bash
npm run preview
```

## Tests

The project uses Vitest.

Test coverage includes:

- Postman parser and serializer
- Bruno parser and serializer
- Vault flat JSON parser and serializer
- End-to-end conversions
- Download file names
- Parser edge cases
- UI smoke tests with Testing Library
- Security regression checks for network/storage/telemetry/logging APIs

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

To deploy:

1. Push the project to GitHub.
2. In the repository settings, enable GitHub Pages with GitHub Actions as the source.
3. Push to the `main` branch.

The workflow:

- Installs dependencies
- Runs tests
- Builds the Vite app
- Uploads `dist`
- Deploys to GitHub Pages

Vite is configured with `base: "./"` so built assets work under a GitHub Pages repository subpath.

## Example Inputs

### Postman Environment JSON

```json
{
  "name": "local",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com",
      "type": "default",
      "enabled": true
    },
    {
      "key": "clientSecret",
      "value": "fake-secret",
      "type": "secret",
      "enabled": true
    }
  ],
  "_postman_variable_scope": "environment"
}
```

### Bruno Environment

```bru
vars {
  baseUrl: https://api.example.com
  clientId: fake-client
  clientSecret: fake-secret
  username: user@example.com
  password: "fake value with spaces"
  tokenUrl: https://auth.example.com/oauth/token
}

vars:secret [
  clientSecret
  password
]
```

### Vault JSON - Flat

```json
{
  "baseUrl": "https://api.example.com",
  "clientId": "fake-client",
  "clientSecret": "fake-secret",
  "username": "user@example.com",
  "password": "fake-password",
  "tokenUrl": "https://auth.example.com/oauth/token"
}
```

## Project Structure

```text
src/
  App.tsx
  main.tsx
  styles.css
  converters/
    types.ts
    normalizer.ts
    postman.ts
    bruno.ts
    vaultJson.ts
    convert.ts
  utils/
    download.ts
    clipboard.ts
  test/
    setup.ts
  __tests__/
    App.test.tsx
    bruno.test.ts
    convert.test.ts
    postman.test.ts
    security.test.ts
    vaultJson.test.ts
```

## Known Limitations

- Vault-compatible JSON support is intentionally flat.
- Vault grouped JSON is not supported.
- Nested values in Vault flat JSON are converted with JavaScript string conversion.
- Bruno parsing focuses on environment `vars { ... }` and optional `vars:secret [ ... ]` blocks.
- Secret detection for Vault flat JSON is heuristic and based on key names.
- The app does not validate credentials with Postman, Bruno, or HashiCorp Vault.
- The app does not encrypt, redact, or persist secrets; it only converts the text currently in the page.
