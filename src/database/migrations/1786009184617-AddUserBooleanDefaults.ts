import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBooleanDefaults1786009184617 implements MigrationInterface {
  name = 'AddUserBooleanDefaults1786009184617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "onboardingDone" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "emailVerified" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "onboardingDone" DROP DEFAULT`,
    );
  }
}
