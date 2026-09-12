import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { SUPPORTED_LOCALES } from '../../utils/i18n/locale';

export class UpdateLocaleDto {
  @ApiProperty({
    type: String,
    example: 'en',
    enum: SUPPORTED_LOCALES as string[],
    description:
      'Preferred UI locale. Must be one of GET /api/v1/i18n/locales.',
  })
  @IsIn(SUPPORTED_LOCALES as string[], {
    message: `locale: unsupportedLocale — expected one of ${SUPPORTED_LOCALES.join(', ')}`,
  })
  locale: string;
}
