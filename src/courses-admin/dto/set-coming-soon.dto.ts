import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetComingSoonDto {
  @ApiProperty({
    description:
      'true shows the unpublished course in the public catalog as "Sắp ra ' +
      'mắt" (greyed, not clickable, listed last); false hides it again.',
  })
  @IsBoolean()
  comingSoon: boolean;
}
