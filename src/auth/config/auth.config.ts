import { registerAs } from '@nestjs/config';

import { IsString, Validate } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { AuthConfig } from './auth-config.type';
import { IsStrongSecret } from './is-strong-secret.validator';
import ms from 'ms';

class EnvironmentVariablesValidator {
  // Every JWT secret is checked, not just the access-token one: a weak
  // AUTH_FORGOT_SECRET forges password-reset links, and a weak
  // AUTH_CONFIRM_EMAIL_SECRET confirms an address the caller doesn't own.
  @IsString()
  @Validate(IsStrongSecret)
  AUTH_JWT_SECRET: string;

  @IsString()
  AUTH_JWT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @Validate(IsStrongSecret)
  AUTH_REFRESH_SECRET: string;

  @IsString()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  @Validate(IsStrongSecret)
  AUTH_FORGOT_SECRET: string;

  @IsString()
  AUTH_FORGOT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @Validate(IsStrongSecret)
  AUTH_CONFIRM_EMAIL_SECRET: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    secret: process.env.AUTH_JWT_SECRET,
    expires: process.env.AUTH_JWT_TOKEN_EXPIRES_IN as ms.StringValue,
    refreshSecret: process.env.AUTH_REFRESH_SECRET,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
    forgotSecret: process.env.AUTH_FORGOT_SECRET,
    forgotExpires: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN as ms.StringValue,
    confirmEmailSecret: process.env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires: process.env
      .AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN as ms.StringValue,
  };
});
