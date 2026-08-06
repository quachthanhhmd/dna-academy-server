import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class Role {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  description?: string | null;

  @Allow()
  @ApiProperty({
    type: Number,
  })
  id: number;

  @ApiProperty({
    type: Boolean,
    default: true,
  })
  isActive?: boolean;

  @Allow()
  @ApiProperty({
    type: String,
    example: 'admin',
  })
  name?: string;
}
