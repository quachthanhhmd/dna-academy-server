import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentCurrentStatus1787800000000 implements MigrationInterface {
  name = 'AddStudentCurrentStatus1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_profile"
         ADD "current_status_code_id" uuid,
         ADD "custom_status" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profile"
         ADD CONSTRAINT "FK_student_profile_current_status_code"
         FOREIGN KEY ("current_status_code_id")
         REFERENCES "master_data_code"("id")
         ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_profile"
         DROP CONSTRAINT "FK_student_profile_current_status_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profile"
         DROP COLUMN "custom_status",
         DROP COLUMN "current_status_code_id"`,
    );
  }
}
