import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converts every `timestamp without time zone` column to `timestamptz`, and
 * `user.date_of_birth` to `date`.
 *
 * **Why.** A `timestamp without time zone` carries no offset, so its meaning
 * depends entirely on who reads it. The `pg` driver parses one into a JS
 * `Date` using the *Node process's* local zone — so today's values are correct
 * only because nothing sets `TZ` and Alpine defaults to UTC. Setting
 * `TZ=Asia/Ho_Chi_Minh` on the API container, which is a reasonable thing to
 * want for readable logs, would silently shift every timestamp the application
 * reads by seven hours: certificate dates, completion dates, progress
 * timestamps, all of it. `timestamptz` stores an absolute instant, so the
 * driver reconstructs the same moment regardless of the process zone.
 *
 * **The `USING` clause is not optional.** Without it Postgres reinterprets the
 * existing values using the session's `TimeZone`, which is only harmless when
 * that happens to be UTC. `AT TIME ZONE 'UTC'` states the assumption the data
 * was written under — every writer is `new Date()` serialised as UTC — and
 * makes the conversion independent of whoever runs the migration. This is the
 * one chance to get it right: afterwards the original offset is gone and no
 * information remains to correct a wrong guess.
 *
 * **`date_of_birth` goes to `date`, not `timestamptz`.** A birth date is a
 * calendar date, not an instant. Stored as `timestamptz` it would render as
 * the previous day for any reader west of the writer — a person born
 * 20/05/1990 showing as the 19th. The cast is a plain `::date`, which keeps
 * the stored calendar date exactly as written rather than moving it across a
 * zone boundary.
 *
 * **Not covered:** `certificate.completion_date` becomes `timestamptz` like
 * the rest. It is arguably a calendar date too, but it is a frozen snapshot
 * already printed on issued certificates and shown on the public verification
 * page, so its stored value is left alone and rendering handles the zone.
 *
 * Indexes and constraints on these columns are rebuilt by `ALTER TYPE`
 * automatically; no index is dropped or recreated here.
 */
const TIMESTAMP_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  // career_reflection_answer
  ['career_reflection_answer', 'created_at'],
  ['career_reflection_answer', 'submitted_at'],
  ['career_reflection_answer', 'updated_at'],
  // career_reflection_question
  ['career_reflection_question', 'created_at'],
  ['career_reflection_question', 'updated_at'],
  // certificate
  ['certificate', 'completion_date'],
  ['certificate', 'created_at'],
  ['certificate', 'issued_at'],
  ['certificate', 'updated_at'],
  // course
  ['course', 'created_at'],
  ['course', 'published_at'],
  ['course', 'unpublished_at'],
  ['course', 'updated_at'],
  // course_group_assignment
  ['course_group_assignment', 'created_at'],
  ['course_group_assignment', 'updated_at'],
  // course_instructor
  ['course_instructor', 'created_at'],
  ['course_instructor', 'updated_at'],
  // course_learning_outcome
  ['course_learning_outcome', 'created_at'],
  ['course_learning_outcome', 'updated_at'],
  // course_rating
  ['course_rating', 'created_at'],
  ['course_rating', 'submitted_at'],
  ['course_rating', 'updated_at'],
  // course_requirement
  ['course_requirement', 'created_at'],
  ['course_requirement', 'updated_at'],
  // course_target_learner
  ['course_target_learner', 'created_at'],
  ['course_target_learner', 'updated_at'],
  // enrollment
  ['enrollment', 'completed_at'],
  ['enrollment', 'created_at'],
  ['enrollment', 'enrollment_date'],
  ['enrollment', 'last_accessed_at'],
  ['enrollment', 'started_at'],
  ['enrollment', 'updated_at'],
  // instructor
  ['instructor', 'created_at'],
  ['instructor', 'updated_at'],
  // instructor_expertise
  ['instructor_expertise', 'created_at'],
  ['instructor_expertise', 'updated_at'],
  // instructor_social_link
  ['instructor_social_link', 'created_at'],
  ['instructor_social_link', 'updated_at'],
  // lecture
  ['lecture', 'created_at'],
  ['lecture', 'updated_at'],
  // lecture_content_article
  ['lecture_content_article', 'created_at'],
  ['lecture_content_article', 'updated_at'],
  // lecture_content_document
  ['lecture_content_document', 'created_at'],
  ['lecture_content_document', 'updated_at'],
  // lecture_content_quiz
  ['lecture_content_quiz', 'created_at'],
  ['lecture_content_quiz', 'updated_at'],
  // lecture_content_reflection
  ['lecture_content_reflection', 'created_at'],
  ['lecture_content_reflection', 'updated_at'],
  // lecture_content_video
  ['lecture_content_video', 'created_at'],
  ['lecture_content_video', 'updated_at'],
  // lecture_progress
  ['lecture_progress', 'completed_at'],
  ['lecture_progress', 'created_at'],
  ['lecture_progress', 'started_at'],
  ['lecture_progress', 'updated_at'],
  // master_data_code
  ['master_data_code', 'created_at'],
  ['master_data_code', 'updated_at'],
  // master_data_group
  ['master_data_group', 'created_at'],
  ['master_data_group', 'updated_at'],
  // media_file
  ['media_file', 'created_at'],
  ['media_file', 'updated_at'],
  // module
  ['module', 'created_at'],
  ['module', 'updated_at'],
  // oauth_account
  ['oauth_account', 'created_at'],
  ['oauth_account', 'token_expires_at'],
  ['oauth_account', 'updated_at'],
  // permission
  ['permission', 'created_at'],
  ['permission', 'updated_at'],
  // quiz_answer_option
  ['quiz_answer_option', 'created_at'],
  ['quiz_answer_option', 'updated_at'],
  // quiz_attempt
  ['quiz_attempt', 'created_at'],
  ['quiz_attempt', 'submitted_at'],
  ['quiz_attempt', 'updated_at'],
  // quiz_attempt_answer
  ['quiz_attempt_answer', 'created_at'],
  ['quiz_attempt_answer', 'graded_at'],
  ['quiz_attempt_answer', 'updated_at'],
  // quiz_question
  ['quiz_question', 'created_at'],
  ['quiz_question', 'updated_at'],
  // quiz_save
  ['quiz_save', 'created_at'],
  ['quiz_save', 'saved_at'],
  ['quiz_save', 'updated_at'],
  // reflection_question
  ['reflection_question', 'created_at'],
  ['reflection_question', 'updated_at'],
  // reflection_response
  ['reflection_response', 'created_at'],
  ['reflection_response', 'submitted_at'],
  ['reflection_response', 'updated_at'],
  // role_permission
  ['role_permission', 'created_at'],
  ['role_permission', 'updated_at'],
  // section
  ['section', 'created_at'],
  ['section', 'updated_at'],
  // session
  ['session', 'created_at'],
  ['session', 'deleted_at'],
  ['session', 'updated_at'],
  // student_career_interest
  ['student_career_interest', 'created_at'],
  ['student_career_interest', 'updated_at'],
  // student_profile
  ['student_profile', 'created_at'],
  ['student_profile', 'updated_at'],
  // user
  ['user', 'created_at'],
  ['user', 'deleted_at'],
  ['user', 'updated_at'],
  // user_role
  ['user_role', 'assigned_at'],
  ['user_role', 'created_at'],
  ['user_role', 'updated_at'],
];

export class AlterTimestampsToTimestamptz1787200000000 implements MigrationInterface {
  name = 'AlterTimestampsToTimestamptz1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of TIMESTAMP_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE timestamptz ` +
          `USING "${column}" AT TIME ZONE 'UTC'`,
      );
    }

    // A calendar date, never an instant — see the note above.
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "date_of_birth" TYPE date ` +
        `USING "date_of_birth"::date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // `::timestamp` on a timestamptz renders it in the session's TimeZone, so
    // the reverse conversion is pinned to UTC the same way the forward one is.
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "date_of_birth" TYPE TIMESTAMP ` +
        `USING "date_of_birth"::timestamp`,
    );

    for (const [table, column] of [...TIMESTAMP_COLUMNS].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP ` +
          `USING "${column}" AT TIME ZONE 'UTC'`,
      );
    }
  }
}
