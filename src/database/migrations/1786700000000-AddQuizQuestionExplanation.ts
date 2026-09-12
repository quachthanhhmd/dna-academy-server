import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 4 v2.3 §2.1 — `quiz_question.explanation`.
 *
 * §5.6's fail-review panel always promised "the correct answer and
 * explanation (if any)", but there was no column to author one into. Nullable
 * and with no default, so this is a metadata-only ALTER: no table rewrite and
 * nothing to backfill — NULL is exactly "no explanation was written".
 *
 * The column is answer-key material. Nothing pre-submit may select it; see
 * `QuizService.loadQuestions`, where the client projection deliberately omits
 * it alongside `isCorrect`.
 */
export class AddQuizQuestionExplanation1786700000000 implements MigrationInterface {
  name = 'AddQuizQuestionExplanation1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_question" ADD "explanation" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_question" DROP COLUMN "explanation"`,
    );
  }
}
