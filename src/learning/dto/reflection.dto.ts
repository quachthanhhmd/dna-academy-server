import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** ~5000 words is the FE cap; this is the matching server guard. */
const MAX_RESPONSE_CHARS = 40000;

export class ReflectionAnswerDto {
  @ApiProperty({ type: String })
  @IsUUID()
  questionId: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_RESPONSE_CHARS)
  responseText: string;
}

export class SubmitReflectionDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description:
      'true saves a draft without enforcing the minimum word count and ' +
      'without completing the lecture.',
  })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @ApiProperty({ type: () => [ReflectionAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReflectionAnswerDto)
  answers: ReflectionAnswerDto[];
}
