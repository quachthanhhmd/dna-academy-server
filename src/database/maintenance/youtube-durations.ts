import { AppDataSource } from '../data-source';
import { fetchYoutubeDurations } from '../../youtube/youtube-data-api';
import {
  DurationPlan,
  VideoLectureRow,
  planDurations,
  videoIdOf,
} from './youtube-durations-plan';

/**
 * Rewrites the duration of every YouTube video lecture with the length
 * YouTube reports, then recomputes each touched course's total duration.
 *
 * Only lectures of type `video` with a YouTube link are read; articles,
 * documents and quizzes are never touched. A video YouTube cannot describe
 * (private, deleted, live) keeps the duration it has. Rows already right are
 * skipped, so the script can be re-run.
 *
 *   npm run youtube:durations                 # print the plan
 *   npm run youtube:durations -- --apply      # write it
 *
 * Needs YOUTUBE_API_KEY. Each 50 videos cost one unit of the 10,000 daily
 * YouTube Data API quota.
 */

const formatSecs = (secs: number | null): string => {
  if (secs === null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
};

const printPlan = (plans: DurationPlan[]) => {
  for (const plan of plans) {
    console.log(
      plan.action === 'update'
        ? `update ${plan.lectureId} "${plan.title}": ${formatSecs(plan.from)} -> ${formatSecs(plan.to)}`
        : `skip   ${plan.lectureId} "${plan.title}": ${plan.reason}`,
    );
  }

  const updates = plans.filter((plan) => plan.action === 'update').length;
  console.log(
    `\n${plans.length} video lecture(s): ${updates} to update, ${plans.length - updates} skipped.`,
  );
};

const run = async (): Promise<void> => {
  const apply = process.argv.slice(2).includes('--apply');
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not set');
  }

  await AppDataSource.initialize();

  try {
    const rows: VideoLectureRow[] = await AppDataSource.query(
      `SELECT l."id" AS "lectureId", s."course_id" AS "courseId", l."title",
              l."duration_secs" AS "durationSecs",
              v."youtube_video_id" AS "youtubeVideoId", v."youtube_url" AS "youtubeUrl"
         FROM "lecture" l
         JOIN "section" s ON s."id" = l."section_id"
         JOIN "lecture_content_video" v ON v."lecture_id" = l."id"
        WHERE l."lecture_type" = 'video'
        ORDER BY s."course_id", l."id"`,
    );

    const videoIds = rows
      .map(videoIdOf)
      .filter((id): id is string => id !== null);
    const durations = await fetchYoutubeDurations(videoIds, apiKey);
    const plans = planDurations(rows, durations);

    printPlan(plans);

    const updates = plans.filter(
      (plan): plan is Extract<DurationPlan, { action: 'update' }> =>
        plan.action === 'update',
    );

    if (!apply) {
      if (updates.length > 0) {
        console.log('Dry run. Re-run with --apply to write these durations.');
      }
      return;
    }

    const courseIds = [...new Set(updates.map((plan) => plan.courseId))];

    await AppDataSource.transaction(async (manager) => {
      for (const plan of updates) {
        await manager.query(
          `UPDATE "lecture" SET "duration_secs" = $1, "updated_at" = now() WHERE "id" = $2`,
          [plan.to, plan.lectureId],
        );
      }

      // Same sum CourseAggregatesService.recalculate keeps on every edit.
      for (const courseId of courseIds) {
        await manager.query(
          `UPDATE "course" SET "total_duration_secs" = (
              SELECT COALESCE(SUM(l."duration_secs"), 0)
                FROM "lecture" l JOIN "section" s ON s."id" = l."section_id"
               WHERE s."course_id" = $1
            ) WHERE "id" = $1`,
          [courseId],
        );
      }
    });

    console.log(
      `Updated ${updates.length} lecture(s) across ${courseIds.length} course(s).`,
    );
  } finally {
    await AppDataSource.destroy();
  }
};

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
