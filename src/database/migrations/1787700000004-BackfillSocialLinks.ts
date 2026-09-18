import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Permission model §2.8 (BE-14) — every social identity lives in
 * `oauth_account`.
 *
 * Facebook always wrote links there; Google wrote `user.social_id` instead.
 * Social login now reads only `oauth_account`, so without this every returning
 * Google user would fall through to email matching — and a Google account
 * whose email changed would get a second, empty account.
 *
 * Apple identities are skipped: Apple sign-in is gone (D12), and a link would
 * only be something to unlink later. An identity another account already
 * holds is left with that account — two users claiming one Google id is the
 * S1 exploit's trace, not something to resolve by row order.
 *
 * `user.social_id` is no longer read after this and is left in place for a
 * later cleanup.
 */
export class BackfillSocialLinks1787700000004 implements MigrationInterface {
  name = 'BackfillSocialLinks1787700000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "oauth_account" ("provider", "provider_uid", "user_id")
       SELECT u."provider", u."social_id", u."id"
         FROM "user" u
        WHERE u."social_id" IS NOT NULL
          AND u."provider" IN ('google', 'facebook')
          AND u."deleted_at" IS NULL
       ON CONFLICT ("provider", "provider_uid") DO NOTHING`,
    );
  }

  public async down(): Promise<void> {
    // Backfilled links are indistinguishable from ones made by logging in;
    // `user.social_id` was never touched, so there is nothing to restore.
  }
}
