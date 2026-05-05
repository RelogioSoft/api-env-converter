export type NormalizedVariable = {
  key: string;
  value: string;
  enabled?: boolean;
  secret?: boolean;
};

export type NormalizedEnvironment = {
  name?: string;
  variables: NormalizedVariable[];
};

export type EnvironmentFormat =
  | 'postman'
  | 'bruno'
  | 'vault-flat';

export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}
