import { ApiProperty } from '@nestjs/swagger';
import { FormSubmission } from '../../form-submission/domain/form-submission';

export class FormSubmissionConsent {
  @ApiProperty({ type: () => FormSubmission })
  submission: FormSubmission;
  @ApiProperty({ type: () => String, nullable: false })
  consentCode: string;
  @ApiProperty({ type: () => String, nullable: false })
  version: string;
  @ApiProperty({ type: () => Date, nullable: false })
  acceptedAt: Date;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
