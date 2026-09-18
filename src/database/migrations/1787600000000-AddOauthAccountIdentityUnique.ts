import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One account per social identity.
 *
 * `oauth_account` had no constraint on `(provider, provider_uid)`, and until
 * this release a generated controller let any logged-in user insert rows into
 * it. Social login resolves `(provider, provider_uid)` to a user, so a second
 * row for the same identity made the answer depend on row order.
 *
 * **Refuses to run when duplicates exist.** A duplicate is not ordinary dirty
 * data here: it may be the trace of someone having attached their own social
 * identity to another person's account. Picking a row to keep would either
 * destroy that evidence or keep the attacker's link, so the migration stops and
 * leaves the decision to whoever audits the table.
 */
export class AddOauthAccountIdentityUnique1787600000000 implements MigrationInterface {
  name = 'AddOauthAccountIdentityUnique1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: { provider: string; provider_uid: string }[] =
      await queryRunner.query(
        `SELECT "provider", "provider_uid"
           FROM "oauth_account"
          GROUP BY "provider", "provider_uid"
         HAVING COUNT(*) > 1`,
      );

    if (duplicates.length > 0) {
      throw new Error(
        `oauth_account has ${duplicates.length} social identities linked to ` +
          'more than one account. Audit them before migrating — see the note ' +
          'on AddOauthAccountIdentityUnique1787600000000.',
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UX_oauth_account_identity"
         ON "oauth_account" ("provider", "provider_uid")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UX_oauth_account_identity"`);
  }
}
