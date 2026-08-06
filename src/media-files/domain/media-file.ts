import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MediaFile {
  @Exclude({ toPlainOnly: true })
  uploadedBy?: User | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  sizeBytes?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  mimeType?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  fileName?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  objectKey: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  bucket: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
