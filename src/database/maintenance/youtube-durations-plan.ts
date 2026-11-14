/**
 * Pure planning for `youtube-durations.ts`: which video lectures get a new
 * duration and why the rest are left alone. Kept free of IO so the decisions
 * can be tested.
 */
import { extractYoutubeVideoId } from '../../youtube/youtube-data-api';

export type VideoLectureRow = {
  lectureId: string;
  courseId: string;
  title: string;
  durationSecs: number | null;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
};

export type DurationPlan =
  | {
      action: 'update';
      lectureId: string;
      courseId: string;
      title: string;
      videoId: string;
      from: number | null;
      to: number;
    }
  | {
      action: 'skip';
      lectureId: string;
      title: string;
      reason: string;
    };

/**
 * The stored id when there is one, else the id in the link. A row saved
 * before `youtube_video_id` existed only has the URL.
 */
export const videoIdOf = (row: VideoLectureRow): string | null =>
  row.youtubeVideoId ||
  (row.youtubeUrl ? extractYoutubeVideoId(row.youtubeUrl) : null);

/**
 * `durations` is what the API returned: ids missing from it are private,
 * deleted or unknown; ids mapped to null have no length (live streams).
 */
export const planDurations = (
  rows: VideoLectureRow[],
  durations: Map<string, number | null>,
): DurationPlan[] =>
  rows.map((row): DurationPlan => {
    const videoId = videoIdOf(row);
    const skip = (reason: string): DurationPlan => ({
      action: 'skip',
      lectureId: row.lectureId,
      title: row.title,
      reason,
    });

    if (!videoId) return skip('not a YouTube link');
    if (!durations.has(videoId)) {
      return skip(`video ${videoId} is private, deleted or unknown`);
    }

    const to = durations.get(videoId);
    if (!to) return skip(`video ${videoId} has no duration (live stream?)`);

    const from = row.durationSecs === null ? null : Number(row.durationSecs);
    if (from === to) return skip('already correct');

    return {
      action: 'update',
      lectureId: row.lectureId,
      courseId: row.courseId,
      title: row.title,
      videoId,
      from,
      to,
    };
  });
