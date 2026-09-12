import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocaleDto } from './dto/locale.dto';
import { supportedLocaleDetails } from '../utils/i18n/locale';

@ApiTags('I18n')
@Controller({
  path: 'i18n',
  version: '1',
})
export class LocalesController {
  @ApiOperation({
    summary: 'Public: supported UI locales (no auth)',
    description:
      'Source for the header language switcher (Epic 6 §2.2.3). Exactly one ' +
      'locale is flagged `isDefault` and is what every fallback resolves to.',
  })
  @Get('locales')
  @ApiOkResponse({ type: [LocaleDto] })
  findAll(): LocaleDto[] {
    return supportedLocaleDetails();
  }
}
