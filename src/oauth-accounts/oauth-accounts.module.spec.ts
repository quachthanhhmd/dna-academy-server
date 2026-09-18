import { describe, expect, it, jest } from '@jest/globals';
import { MODULE_METADATA } from '@nestjs/common/constants';

// UsersModule pulls in config factories that validate process.env at import
// time. Only this module's own metadata is under test, so stand it in.
jest.mock('../users/users.module', () => ({ UsersModule: class {} }));

import { OauthAccountsModule } from './oauth-accounts.module';

describe('OauthAccountsModule', () => {
  // A social link decides who a Facebook login signs in as. The generated CRUD
  // controller let any logged-in user create one pointing at any account —
  // including an admin's — and listed everyone's provider tokens. Links are
  // written only by the login flow in AuthService.
  it('should mount no HTTP controller', () => {
    const controllers =
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, OauthAccountsModule) ??
      [];

    expect(controllers).toHaveLength(0);
  });
});
