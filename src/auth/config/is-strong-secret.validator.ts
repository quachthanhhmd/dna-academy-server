import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Anything shorter is brute-forceable offline against a captured token. */
export const MINIMUM_SECRET_LENGTH = 32;

/**
 * Values published in `env/.env.example`, plus the obvious hand-typed ones.
 * A secret that appears in a public repository is not a secret: signing keys
 * are what authenticates every request, so a known value lets anyone mint a
 * token for any user id — no password and no account required.
 */
export const KNOWN_WEAK_SECRETS = new Set([
  'secret',
  'secret_for_refresh',
  'secret_for_forgot',
  'secret_for_confirm_email',
  'changeme',
  'password',
  'test',
  'dev',
]);

/**
 * Environments where a weak signing key is a warning rather than a hard stop.
 * An unset NODE_ENV is deliberately *not* on this list — an environment that
 * forgot to declare itself gets the strict treatment.
 */
const LENIENT_ENVIRONMENTS = ['development', 'test'];

export const describeWeakSecret = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return 'must be set';
  }

  if (KNOWN_WEAK_SECRETS.has(value.toLowerCase())) {
    return 'is a placeholder published in env/.env.example';
  }

  if (value.length < MINIMUM_SECRET_LENGTH) {
    return `must be at least ${MINIMUM_SECRET_LENGTH} characters (got ${value.length})`;
  }

  // A single repeated character passes a length check while carrying almost
  // no entropy, e.g. "aaaaaaaa...".
  if (new Set(value).size < 8) {
    return 'has too little variation to be a signing key';
  }

  return null;
};

@ValidatorConstraint({ name: 'isStrongSecret', async: false })
export class IsStrongSecret implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const problem = describeWeakSecret(value);

    if (!problem) {
      return true;
    }

    const environment = process.env.NODE_ENV;

    if (environment && LENIENT_ENVIRONMENTS.includes(environment)) {
      // Boot is allowed to continue so a teammate pulling this branch with an
      // old .env is not stopped, but the warning names the variable so the
      // fix is obvious.
      console.warn(
        `[security] ${args.property} ${problem}. ` +
          'Generate one with: openssl rand -base64 48',
      );
      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      `${args.property} ${describeWeakSecret(args.value) ?? 'is not a usable signing key'}. ` +
      'Generate one with: openssl rand -base64 48'
    );
  }
}
