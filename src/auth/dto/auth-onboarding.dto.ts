import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
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
  @IsUUID(undefined, { each: true })
  careerInterestIds: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  customInterest?: string;
}
