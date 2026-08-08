import { ApiProperty } from '@nestjs/swagger';
import { Module } from '../../modules/domain/module';

export class PermissionWithGrantDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  action: string;

  @ApiProperty({ type: String, nullable: true })
  label?: string | null;

  @ApiProperty({ type: Boolean })
  isGranted: boolean;
}

export class ModulePermissionsDto {
  @ApiProperty({ type: () => Module })
  module: Module;

  @ApiProperty({ type: () => [PermissionWithGrantDto] })
  permissions: PermissionWithGrantDto[];
}
