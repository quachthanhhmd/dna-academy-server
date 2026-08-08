import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RolesAdminService } from './roles-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleWithStatsDto } from './dto/role-with-stats.dto';
import { ModulePermissionsDto } from './dto/module-permissions.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { Role } from '../roles/domain/role';

@ApiTags('Admin / Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/roles',
  version: '1',
})
export class RolesAdminController {
  constructor(private readonly rolesAdminService: RolesAdminService) {}

  @ApiOperation({
    summary: 'List all roles with assigned-user counts',
  })
  @RequirePermission('roles', 'view')
  @Get()
  @ApiOkResponse({ type: [RoleWithStatsDto] })
  findAll(): Promise<RoleWithStatsDto[]> {
    return this.rolesAdminService.findAllWithStats();
  }

  @ApiOperation({ summary: 'Create a role' })
  @RequirePermission('roles', 'create')
  @Post()
  @ApiCreatedResponse({ type: Role })
  @ApiConflictResponse({ description: 'A role with this name already exists' })
  create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesAdminService.create(dto);
  }

  @ApiOperation({ summary: 'Update a role' })
  @RequirePermission('roles', 'edit')
  @Patch(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Role })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'A role with this name already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesAdminService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Delete a role',
    description:
      'Fails with 409 ROLE_HAS_USERS if any user is still assigned this role.',
  })
  @RequirePermission('roles', 'delete')
  @Delete(':id')
  @ApiParam({ name: 'id', type: Number })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Role still has assigned users' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.rolesAdminService.remove(id);
  }

  @ApiOperation({
    summary: 'Get a role’s permissions grouped by module',
  })
  @RequirePermission('roles', 'view')
  @Get(':id/permissions')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: [ModulePermissionsDto] })
  @ApiNotFoundResponse()
  getPermissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ModulePermissionsDto[]> {
    return this.rolesAdminService.getPermissions(id);
  }

  @ApiOperation({
    summary: 'Replace a role’s permissions',
    description: 'Sets role_permissions to exactly the given permissionIds.',
  })
  @RequirePermission('roles', 'edit')
  @Put(':id/permissions')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: [ModulePermissionsDto] })
  @ApiNotFoundResponse()
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRolePermissionsDto,
  ): Promise<ModulePermissionsDto[]> {
    return this.rolesAdminService.setPermissions(id, dto.permissionIds);
  }
}
