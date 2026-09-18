import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthResetPasswordDto } from './auth-reset-password.dto';

describe('AuthResetPasswordDto', () => {
  const errorsFor = async (body: Record<string, unknown>) =>
    (await validate(plainToInstance(AuthResetPasswordDto, body))).map(
      (error) => error.property,
    );

  // Registration requires six characters; a reset must not be the way around it.
  it('should reject a password shorter than registration allows', async () => {
    expect(await errorsFor({ hash: 'h', password: '12345' })).toContain(
      'password',
    );
  });

  it('should accept a password of the registration minimum', async () => {
    expect(await errorsFor({ hash: 'h', password: '123456' })).toEqual([]);
  });
});
