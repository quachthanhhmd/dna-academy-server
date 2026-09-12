import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CertificateDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'DNA-2026-000123' })
  number: string;

  @ApiProperty({ type: String })
  studentName: string;

  @ApiProperty({ type: String })
  courseTitle: string;

  @ApiProperty({ type: Date })
  completionDate: Date;

  @ApiProperty({ type: Date, nullable: true })
  issuedAt: Date | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 96,
    description:
      'Epic 4.5 §1.5 — the grade frozen onto this certificate at issue time. ' +
      'Never recomputed, whatever the student does afterwards. Null when ' +
      'they submitted no quiz, which renders as no grade row rather than 0%.',
  })
  finalGradePct: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'A+',
    description: 'Null exactly when finalGradePct is null.',
  })
  gradeLabel: string | null;

  @ApiProperty({
    type: String,
    example: 'DNA Learning Academy',
    description: 'Epic 4.1 §3.2 — from CERTIFICATE_ISSUER_NAME.',
  })
  issuerName: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Signature image for the card. Null means draw a placeholder stroke.',
  })
  signatureUrl: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Always null in V1 (Epic 4.1 D4) — the record is issued and the ' +
      'Download button prints the card client-side. `ready: false` means the ' +
      'course is unfinished, never that a PDF is rendering, so do not poll.',
  })
  fileUrl: string | null;
}

/** Epic 4.1 D6 — the live course, distinct from the certificate's snapshot. */
export class CertificateCourseDto {
  @ApiProperty({
    type: String,
    description: 'Use for /career-reflection-questions/grouped?courseId=',
  })
  id: string;

  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({
    type: String,
    description:
      'Live title. certificate.courseTitle is the snapshot and may differ ' +
      'after a retitle — print the snapshot on the card, this in the chrome.',
  })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;
}

/** Epic 4.1 D6 — the Explore Pathway card. Null means hide it. */
export class CertificatePathwayDto {
  @ApiProperty({
    type: String,
    description: 'Use for /courses?groupId= to open the filtered catalog.',
  })
  groupId: string;

  @ApiProperty({
    type: String,
    description: 'Already localized by the Epic 6 locale chain.',
  })
  name: string;
}

/**
 * Epic 4.1 D6 — `GET /enrollments/:id/certificate`.
 *
 * The course context sits at the **root**, not inside `certificate`, because
 * the `ready: false` branch has no certificate object at all — and that is
 * precisely the branch that needs the course, the progress and a way back to
 * the unfinished lecture. Nesting it would have fixed the happy path and left
 * the empty state making the same extra calls.
 */
export class CertificateResponseDto {
  @ApiProperty({
    type: Boolean,
    description:
      'False means the course is not finished. It never means "the PDF is ' +
      'rendering" — issuance is synchronous, so polling this spins forever.',
  })
  ready: boolean;

  @ApiProperty({ type: () => CertificateCourseDto })
  course: CertificateCourseDto;

  @ApiProperty({ type: Number, example: 62 })
  progressPct: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Where "Continue learning" goes. Null when the course was never opened.',
  })
  lastLectureId: string | null;

  @ApiProperty({ type: () => CertificatePathwayDto, nullable: true })
  pathway: CertificatePathwayDto | null;

  @ApiProperty({ type: () => CertificateDto, nullable: true })
  certificate: CertificateDto | null;
}

export class UpsertRatingDto {
  @ApiProperty({ type: Number, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ type: String, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reviewText?: string;
}

export class RatingDto {
  @ApiProperty({ type: Number })
  rating: number;

  @ApiProperty({ type: String, nullable: true })
  reviewText: string | null;

  @ApiProperty({ type: String, example: 'pending' })
  reviewStatus: string;

  @ApiProperty({ type: Date, nullable: true })
  submittedAt: Date | null;
}

export class CareerReflectionAnswerDto {
  @ApiProperty({ type: String })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  textAnswer?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  ratingAnswer?: number;
}

export class SubmitCareerReflectionDto {
  @ApiProperty({ type: () => [CareerReflectionAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareerReflectionAnswerDto)
  answers: CareerReflectionAnswerDto[];
}

/** Epic 4.1 §3.2 — `GET /certificate-verify/:number`, public. */
export class CertificateVerificationDto {
  @ApiProperty({ type: Boolean, example: true })
  valid: boolean;

  @ApiProperty({ type: String, example: 'DNA-2026-000123' })
  number: string;

  @ApiProperty({
    type: String,
    example: 'Nguyễn Văn A.',
    description:
      'Masked. The full name is only ever shown to the certificate owner via ' +
      'GET /enrollments/:id/certificate.',
  })
  studentName: string;

  @ApiProperty({ type: String })
  courseTitle: string;

  @ApiProperty({ type: Date })
  completionDate: Date;

  @ApiProperty({ type: String, example: 'DNA Learning Academy' })
  issuerName: string;
}
