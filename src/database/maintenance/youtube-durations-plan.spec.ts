import { describe, expect, it } from '@jest/globals';
import { VideoLectureRow, planDurations } from './youtube-durations-plan';

const row = (overrides: Partial<VideoLectureRow>): VideoLectureRow => ({
  lectureId: 'l1',
  courseId: 'c1',
  title: 'Intro',
  durationSecs: 4500,
  youtubeVideoId: 'dQw4w9WgXcQ',
  youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
  ...overrides,
});

describe('planDurations', () => {
  it('should update a lecture whose stored duration differs from YouTube', () => {
    const [plan] = planDurations([row({})], new Map([['dQw4w9WgXcQ', 213]]));

    expect(plan).toEqual({
      action: 'update',
      lectureId: 'l1',
      courseId: 'c1',
      title: 'Intro',
      videoId: 'dQw4w9WgXcQ',
      from: 4500,
      to: 213,
    });
  });

  it('should read the id from the URL when the row predates youtube_video_id', () => {
    const [plan] = planDurations(
      [row({ youtubeVideoId: null, durationSecs: null })],
      new Map([['dQw4w9WgXcQ', 213]]),
    );

    expect(plan).toMatchObject({ action: 'update', from: null, to: 213 });
  });

  it('should skip a lecture that is already right, so re-runs change nothing', () => {
    const [plan] = planDurations(
      [row({ durationSecs: 213 })],
      new Map([['dQw4w9WgXcQ', 213]]),
    );

    expect(plan).toMatchObject({ action: 'skip', reason: 'already correct' });
  });

  it('should keep the duration of a video YouTube cannot describe', () => {
    const plans = planDurations(
      [
        row({ lectureId: 'private' }),
        row({ lectureId: 'live', youtubeVideoId: 'liveStream1' }),
        row({
          lectureId: 'other',
          youtubeVideoId: null,
          youtubeUrl: 'https://vimeo.com/1',
        }),
      ],
      new Map([['liveStream1', null]]),
    );

    expect(plans.map((plan) => plan.action)).toEqual(['skip', 'skip', 'skip']);
  });
});
