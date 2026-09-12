import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { SeedModule } from '../seeds/relational/seed.module';
import { CodePlan, CodeRow, planForCode } from './junk-code-plan';

/**
 * Epic 4.2 §4.1 — BUG-04. Removes the test residue from master data.
 *
 * `course_level` held 585 rows against ~4 real ones, `course_category` 304
 * against ~6, because no e2e spec had an `afterAll` and the suite ran against
 * the dev database. Admin dropdowns became unusable and the course-import
 * script picked a junk row.
 *
 * A script and not a migration: it touches data rather than schema, the rule
 * for what counts as junk is a heuristic, and it must be run deliberately by
 * someone who reads the plan first.
 *
 *   npm run clean:master-data            # print the plan, change nothing
 *   npm run clean:master-data -- --apply # do it
 *
 * The real fix is the isolated test stack (`docker-compose.test.yaml`), which
 * stops the accumulation. This clears what is already there.
 */

/** Where a code can be referenced from. Each entry is one FK to check. */
const REFERENCES: { table: string; column: string }[] = [
  { table: 'course', column: 'levelId' },
  { table: 'course', column: 'categoryId' },
  { table: 'course_group_assignment', column: 'groupId' },
  { table: 'instructor_expertise', column: 'expertiseCodeId' },
  { table: 'student_profile', column: 'educationStageCodeId' },
  { table: 'student_career_interest', column: 'careerInterestId' },
];

const GROUPS = ['course_level', 'course_category', 'course_group'];

const countReferences = async (
  dataSource: DataSource,
  codeId: string,
): Promise<number> => {
  let total = 0;

  for (const ref of REFERENCES) {
    // A table or column may not exist in every environment; a missing FK is
    // not a reason to delete a row, so treat the lookup as "unknown, be safe".
    try {
      const [row] = await dataSource.query(
        `SELECT count(*)::int AS n FROM "${ref.table}" WHERE "${ref.column}" = $1`,
        [codeId],
      );
      total += row?.n ?? 0;
    } catch {
      total += 1;
    }
  }

  return total;
};

const run = async (): Promise<void> => {
  const apply = process.argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['warn', 'error'],
  });
  const dataSource = app.get(DataSource);

  const tally: Record<CodePlan, number> = {
    delete: 0,
    deactivate: 0,
    skip: 0,
  };

  for (const groupKey of GROUPS) {
    const codes: CodeRow[] = await dataSource.query(
      `SELECT c."id", c."name", c."isActive"
         FROM "master_data_code" c
         JOIN "master_data_group" g ON g."id" = c."groupId"
        WHERE g."groupKey" = $1
        ORDER BY c."name"`,
      [groupKey],
    );

    const plans = await Promise.all(
      codes.map(async (code) => ({
        code,
        references: await countReferences(dataSource, code.id),
      })),
    );

    const actionable = plans
      .map(({ code, references }) => ({
        code,
        references,
        plan: planForCode(code, references),
      }))
      .filter((entry) => entry.plan !== 'skip');

    console.log(
      `\n${groupKey}: ${codes.length} codes, ${actionable.length} to change`,
    );

    for (const entry of actionable) {
      tally[entry.plan] += 1;
      console.log(
        `  ${entry.plan.padEnd(10)} ${entry.code.name}` +
          (entry.references ? `  (${entry.references} references)` : ''),
      );

      if (!apply) {
        continue;
      }

      if (entry.plan === 'delete') {
        await dataSource.query(
          `DELETE FROM "master_data_code" WHERE "id" = $1`,
          [entry.code.id],
        );
      } else {
        await dataSource.query(
          `UPDATE "master_data_code" SET "isActive" = false WHERE "id" = $1`,
          [entry.code.id],
        );
      }
    }

    tally.skip += codes.length - actionable.length;
  }

  console.log(
    `\n${apply ? 'Applied' : 'Plan'}: ` +
      `${tally.delete} delete, ${tally.deactivate} deactivate, ${tally.skip} keep`,
  );

  if (!apply) {
    console.log('Nothing was changed. Re-run with --apply to do it.');
  }

  await app.close();
};

void run();
