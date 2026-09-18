import { describe, expect, it } from '@jest/globals';
import { getMetadataArgsStorage } from 'typeorm';
import { OauthAccountEntity } from './oauth-account.entity';

describe('OauthAccountEntity', () => {
  const indicesOn = (target: unknown) =>
    getMetadataArgsStorage().indices.filter((index) => index.target === target);

  const columnsOf = (columns: unknown): string[] =>
    (Array.isArray(columns) ? (columns as string[]) : []).slice().sort();

  // Without it one Facebook or Google identity can be linked to several
  // accounts, and login signs in as whichever row the database returns first.
  it('should allow one account per provider identity', () => {
    const unique = indicesOn(OauthAccountEntity).filter(
      (index) =>
        index.unique &&
        columnsOf(index.columns).join() === ['provider', 'providerUid'].join(),
    );

    expect(unique).toHaveLength(1);
  });
});
