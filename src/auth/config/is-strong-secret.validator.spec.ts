import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  describeWeakSecret,
  IsStrongSecret,
  MINIMUM_SECRET_LENGTH,
} from './is-strong-secret.validator';

const args = (value: unknown) =>
  ({
    property: 'AUTH_JWT_SECRET',
    value,
    constraints: [],
    targetName: '',
    object: {},
  }) as any;

const strong = 'K7mQx9vLpZ2bN4wR8tY6uA3sD5fG1hJ0cV+eX/iO=';

describe('describeWeakSecret', () => {
  it('should accept a generated secret', () => {
    expect(describeWeakSecret(strong)).toBeNull();
  });

  it('should reject the placeholders published in env/.env.example', () => {
    for (const placeholder of [
      'secret',
      'secret_for_refresh',
      'secret_for_forgot',
      'secret_for_confirm_email',
    ]) {
      expect(describeWeakSecret(placeholder)).toContain('placeholder');
    }
  });

  it('should reject a short secret and say how short it was', () => {
    expect(describeWeakSecret('a1B2c3D4')).toBe(
      `must be at least ${MINIMUM_SECRET_LENGTH} characters (got 8)`,
    );
  });

  it('should reject a long but low-entropy secret', () => {
    // Passes the length check, carries almost no entropy.
    expect(describeWeakSecret('a'.repeat(64))).toContain(
      'too little variation',
    );
  });

  it('should reject an unset or empty value', () => {
    expect(describeWeakSecret(undefined)).toBe('must be set');
    expect(describeWeakSecret('')).toBe('must be set');
  });
});

describe('IsStrongSecret', () => {
  const validator = new IsStrongSecret();
  const original = process.env.NODE_ENV;
  let warn: any;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = original;
    warn.mockRestore();
  });

  it('should pass a strong secret in every environment', () => {
    for (const environment of ['development', 'test', 'production']) {
      process.env.NODE_ENV = environment;
      expect(validator.validate(strong, args(strong))).toBe(true);
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('should block a weak secret in production', () => {
    process.env.NODE_ENV = 'production';

    expect(validator.validate('secret', args('secret'))).toBe(false);
  });

  it('should block a weak secret when NODE_ENV is unset', () => {
    // The strict default matters most here: an environment that forgot to
    // declare itself is the one most likely to be a real deployment.
    delete process.env.NODE_ENV;

    expect(validator.validate('secret', args('secret'))).toBe(false);
  });

  it('should warn but allow a weak secret in development', () => {
    process.env.NODE_ENV = 'development';

    expect(validator.validate('secret', args('secret'))).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('AUTH_JWT_SECRET'),
    );
  });

  it('should name the variable and the remedy in the failure message', () => {
    expect(validator.defaultMessage(args('secret'))).toContain(
      'openssl rand -base64 48',
    );
  });
});
