import { ApiProperty } from '@nestjs/swagger';

export class LocaleDto {
  @ApiProperty({ type: String, example: 'vi' })
  code: string;

  @ApiProperty({
    type: String,
    example: 'Tiếng Việt',
    description: 'Native name, so the switcher reads correctly in-language.',
  })
  name: string;

  @ApiProperty({ type: Boolean })
  isDefault: boolean;
}
