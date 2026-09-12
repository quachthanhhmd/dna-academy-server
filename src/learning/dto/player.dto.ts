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
}
