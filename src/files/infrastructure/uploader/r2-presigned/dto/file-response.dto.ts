import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '../../../../domain/file';

export class FileResponseDto {
  @ApiProperty({
    type: () => FileType,
  })
  file: FileType;

  @ApiProperty({
    type: String,
    description: 'Presigned R2 URL to PUT the file to. Valid for one hour.',
  })
  uploadSignedUrl: string;
}
