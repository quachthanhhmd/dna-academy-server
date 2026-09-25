import { ApiProperty } from '@nestjs/swagger';
import { FormSubmission } from '../../form-submission/domain/form-submission';
import { User } from '../../users/domain/user';

export class FormSubmissionEvent {
  @ApiProperty({ type: () => FormSubmission })
  submission: FormSubmission;
  @ApiProperty({ type: () => String, nullable: false })
  event: string;
  @ApiProperty({ type: () => String, nullable: true })
  fromStatus: string | null;
  @ApiProperty({ type: () => String, nullable: true })
  toStatus: string | null;
  @ApiProperty({ type: () => User })
  actorUser: User;
  @ApiProperty({ type: () => String, nullable: true })
  payload: Record<string, unknown> | null;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
