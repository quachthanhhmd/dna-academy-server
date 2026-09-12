import { ApiProperty } from '@nestjs/swagger';

export class LocaleCoverageDto {
  @ApiProperty({ type: Number, description: 'Codes in scope for this group.' })
  total: number;

  @ApiProperty({ type: Number, description: 'Codes that have this locale.' })
  translated: number;

  @ApiProperty({
    type: [String],
    description: 'Ids of the codes still missing this locale.',
  })
  missingIds: string[];
}

/** `{ "en": { total, translated, missingIds } }`, one entry per supported locale. */
export type TranslationCoverageDto = Record<string, LocaleCoverageDto>;
