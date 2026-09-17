import { ApiProperty } from '@nestjs/swagger';

export class StartEnrollmentDto {
  @ApiProperty({ type: String, example: 'in_progress' })
  status: string;

  @ApiProperty({ type: Date, nullable: true })
  startedAt: Date | null;
}

export class LectureViewDto {
  @ApiProperty({ type: String })
  lectureId: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Epic 4 v2.2 — per-lecture blurb. Null means render nothing; do NOT ' +
      'fall back to the course short description.',
  })
  description: string | null;

  @ApiProperty({ type: String, example: 'video' })
  lectureType: string;

  @ApiProperty({ type: Number })
  durationSecs: number;

  @ApiProperty({ type: Boolean })
  isPreview: boolean;

  @ApiProperty({ type: Boolean })
  requiresCompletion: boolean;

  @ApiProperty({ type: String })
  sectionId: string;

  @ApiProperty({ type: String })
  sectionTitle: string;

  @ApiProperty({ type: String, nullable: true })
  enrollmentId: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'Type-specific payload: youtubeVideoId | bodyHtml | fileUrl | quiz meta | reflection questions.',
  })
  contentPayload: Record<string, unknown> | null;

  @ApiProperty({ type: String, nullable: true })
  prevLectureId: string | null;

  @ApiProperty({ type: String, nullable: true })
  nextLectureId: string | null;

  @ApiProperty({ type: Boolean })
  isLocked: boolean;

  @ApiProperty({ type: String, nullable: true, example: null })
  lockReason: string | null;

  @ApiProperty({ type: String, example: 'not_started' })
  progressStatus: string;

  @ApiProperty({ type: Number })
  watchDurationSecs: number;

  /*
    Course progress, so the player header can draw its dial on load.

    Without these the FE had nothing to read until the first progress write
    answered with them, so the header showed 0% for a student who had
    finished the course, and counted completions itself — which is how it
    ended up reporting "22/22" beside "27%".
  */
  @ApiProperty({ type: Number, example: 27 })
  progressPct: number;

  @ApiProperty({ type: Number, example: 6 })
  completedRequired: number;

  @ApiProperty({ type: Number, example: 22 })
  totalRequired: number;
}
