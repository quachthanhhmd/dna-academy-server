import { ApiProperty } from '@nestjs/swagger';

export class Module {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  label?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  name: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
