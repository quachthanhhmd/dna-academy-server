import { Module } from '../../modules/domain/module';

import { ApiProperty } from '@nestjs/swagger';

export class Permission {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  label?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  action: string;

  @ApiProperty({
    type: () => Module,
    nullable: false,
  })
  module: Module;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
