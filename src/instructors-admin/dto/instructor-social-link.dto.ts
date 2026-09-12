import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { SOCIAL_LINK_PLATFORMS } from '../../instructor-social-links/domain/instructor-social-link';

export class InstructorSocialLinkInputDto {
  @ApiProperty({ enum: SOCIAL_LINK_PLATFORMS, example: 'linkedin' })
  @IsIn(SOCIAL_LINK_PLATFORMS as unknown as string[])
  platform: string;

  @ApiProperty({ example: 'https://www.linkedin.com/in/nguyen-van-a' })
  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
