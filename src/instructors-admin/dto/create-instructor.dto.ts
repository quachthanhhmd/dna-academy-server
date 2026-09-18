import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { InstructorSocialLinkInputDto } from './instructor-social-link.dto';

export class CreateInstructorDto {
  @ApiProperty({ example: 'Nguyễn Văn A', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  fullName: string;

  @ApiPropertyOptional({
    example: 'nguyen-van-a',
    description:
      'Optional override. When omitted the slug is derived from fullName ' +
      '(ASCII-folded, kebab-case) and suffixed -2/-3/... on collision.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiPropertyOptional({
    example: 'Senior Data Analyst @ VNG',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  headline?: string;

  @ApiPropertyOptional({ description: 'Rich text / HTML.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiPropertyOptional({
    description:
      'Publicly displayed address; it does not have to match the linked ' +
      'user account email.',
  })
  @IsOptional()
  @IsEmail()
  emailPublic?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'master_data_code ids from the expertise_area group.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  expertiseCodeIds?: string[];

  @ApiPropertyOptional({ type: () => [InstructorSocialLinkInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructorSocialLinkInputDto)
  socialLinks?: InstructorSocialLinkInputDto[];

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Optional login account to link. One user ↔ one instructor.',
  })
  @IsOptional()
  @IsInt()
  userId?: number | null;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Permission model §1.7 — also create a login account (role Instructor, ' +
      'no password) and invite it. Needs instructors:create_account.',
  })
  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;

  @ApiPropertyOptional({
    example: 'a.nguyen@dna.vn',
    description:
      'The login email of the new account. Required with createAccount. Not ' +
      'emailPublic, which stays the public contact address.',
  })
  @IsOptional()
  @Transform(lowerCaseTransformer)
  @IsEmail()
  accountEmail?: string;

  @ApiPropertyOptional({ type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}
