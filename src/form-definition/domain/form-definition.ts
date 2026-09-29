import { ApiProperty } from '@nestjs/swagger';

export class FormDefinition {
  @ApiProperty({ type: () => String, nullable: false })
  code: string;
  @ApiProperty({ type: () => String, nullable: false })
  nameTranslations: Record<string, string>;
  @ApiProperty({ type: () => String, nullable: true })
  descriptionTranslations: Record<string, string> | null;
  @ApiProperty({ type: () => Number, nullable: false })
  version: number;
  @ApiProperty({ type: () => Boolean, nullable: false })
  isActive: boolean;

  @ApiProperty({ type: String })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
