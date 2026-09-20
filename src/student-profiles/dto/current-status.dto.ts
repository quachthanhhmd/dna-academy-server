import { ApiProperty } from '@nestjs/swagger';

export class CurrentStatusDto {
  @ApiProperty({ example: 'core_skills' })
  code: string;

  @ApiProperty({
    example: 'Xây dựng kỹ năng và dự án để tìm việc',
    description: 'Localized using the request X-Locale.',
  })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: null })
  customLabel?: string | null;
}
