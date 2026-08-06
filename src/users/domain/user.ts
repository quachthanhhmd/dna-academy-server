import { Exclude, Expose } from 'class-transformer';
import { FileType } from '../../files/domain/file';
import { Role } from '../../roles/domain/role';
import { Status } from '../../statuses/domain/status';
import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  onboardingDone: boolean;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  age?: number | null;

  @ApiProperty({
    type: () => Date,
    nullable: true,
  })
  dateOfBirth?: Date | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  profilePictureUrl?: string | null;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  emailVerified: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  fullName: string;

  @ApiProperty({
    type: Number,
  })
  id: number;

  @ApiProperty({
    type: String,
    example: 'john.doe@example.com',
  })
  @Expose({ groups: ['me', 'admin'] })
  email: string | null;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @ApiProperty({
    type: String,
    example: 'email',
  })
  @Expose({ groups: ['me', 'admin'] })
  provider: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
  })
  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;

  @ApiProperty({
    type: String,
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    type: String,
    example: 'Doe',
  })
  lastName: string | null;

  @ApiProperty({
    type: () => FileType,
  })
  photo?: FileType | null;

  @ApiProperty({
    type: () => Role,
  })
  role?: Role | null;

  @ApiProperty({
    type: () => Status,
  })
  status?: Status;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;
}
