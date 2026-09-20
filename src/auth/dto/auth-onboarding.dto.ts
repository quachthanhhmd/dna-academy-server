import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthOnboardingDto {
  @ApiProperty({ type: String })
  @IsUUID()
  @IsNotEmpty()
  educationStageCodeId: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique({
    message: 'Career interests must not contain duplicates',
  })
  @IsUUID(undefined, { each: true })
  careerInterestIds: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  customInterest?: string;

  @ApiProperty({
    type: String,
    example: 'core_skills',
    description:
      'The master_data_code.code from the active learning_goal group; this is a code, not a UUID.',
  })
  // Exactly one validator on purpose: the exception factory joins every
  // failing constraint's message into the field's error string, so a second
  // one here would reach the FE as "Please select your current status,
  // currentStatusCode must be a string". A blank string passes this and is
  // rejected by OnboardingService with the same message.
  @IsString({ message: 'Please select your current status' })
  currentStatusCode: string;

  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  customStatus?: string;
}
