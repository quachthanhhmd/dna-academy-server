import { ApiProperty } from '@nestjs/swagger';
import { Course } from '../../courses/domain/course';
import { FormDefinition } from '../../form-definition/domain/form-definition';
import { User } from '../../users/domain/user';

export class FormSubmission {
  @ApiProperty({ type: () => FormDefinition })
  formDefinition: FormDefinition;
  @ApiProperty({ type: () => Number, nullable: false })
  formVersion: number;
  @ApiProperty({ type: () => User })
  user: User;
  @ApiProperty({ type: () => String, nullable: false })
  fullName: string;
  @ApiProperty({ type: () => String, nullable: false })
  email: string;
  @ApiProperty({ type: () => String, nullable: false })
  emailNormalized: string;
  @ApiProperty({ type: () => String, nullable: true })
  phone: string | null;
  @ApiProperty({ type: () => String, nullable: true })
  primaryFieldCode: string | null;
  @ApiProperty({ type: () => Course })
  selectedCourse: Course;
  @ApiProperty({ type: () => String, nullable: false })
  status: string;
  @ApiProperty({ type: () => User })
  assignedToUser: User;
  @ApiProperty({ type: () => String, nullable: true })
  internalNotes: string | null;
  @ApiProperty({ type: () => Boolean, nullable: false })
  isLatest: boolean;
  @ApiProperty({ type: () => FormSubmission })
  supersededBy: FormSubmission;
  @ApiProperty({ type: () => String, nullable: false })
  source: string;
  @ApiProperty({ type: () => String, nullable: false })
  locale: string;
  @ApiProperty({ type: () => String, nullable: true })
  utm: Record<string, unknown> | null;
  @ApiProperty({ type: () => String, nullable: true })
  ipHash: string | null;
  @ApiProperty({ type: () => String, nullable: true })
  ipHashDay: string | null;
  @ApiProperty({ type: () => String, nullable: true })
  userAgent: string | null;
  @ApiProperty({ type: () => Boolean, nullable: false })
  isSuspicious: boolean;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
