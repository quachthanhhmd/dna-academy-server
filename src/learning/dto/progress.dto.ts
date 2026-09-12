import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class RecordProgressDto {
  @ApiProperty({ enum: ['in_progress', 'completed'] })
  @IsIn(['in_progress', 'completed'])
  status: 'in_progress' | 'completed';

  @ApiPropertyOptional({ type: Number, description: 'Seconds watched/spent.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  watchDurationSecs?: number;
}

export class WatchPositionDto {
  @ApiProperty({ type: Number, description: 'Seconds watched.' })
  @IsInt()
  @Min(0)
  watchDurationSecs: number;
}

export class ProgressResultDto {
  @ApiProperty({ type: Number, example: 40 })
  progressPct: number;

  @ApiProperty({ type: String, example: 'in_progress' })
  enrollmentStatus: string;
}

/** Epic 4.2 §3.2 — `DELETE /admin/enrollments/:id/progress`. */
export class ResetProgressResultDto {
  @ApiProperty({ type: String })
  enrollmentId: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'DNA-2026-000118',
    description:
      'The certificate is never deleted — its number may already be public ' +
      'on the verification page, and re-completing returns the same one.',
  })
  certificateRetained: string | null;
}
