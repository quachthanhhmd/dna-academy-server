import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UserRolesAdminService } from './user-roles-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { RoleChangeResponseDto, SetUserRoleDto } from './dto/set-user-role.dto';
import { UserRoleChangeService } from './user-role-change.service';
import { Role } from '../roles/domain/role';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/users',
  version: '1',
})
export class UserRolesAdminController {
  constructor(
    private readonly userRolesAdminService: UserRolesAdminService,
    private readonly userRoleChangeService: UserRoleChangeService,
  ) {}

  @ApiOperation({ summary: "List a user's assigned roles" })
  @RequirePermission('users', 'view')
  @Get(':id/roles')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: [Role] })
  @ApiNotFoundResponse()
  findRoles(@Param('id', ParseIntPipe) id: number): Promise<Role[]> {
    return this.userRolesAdminService.findRolesForUser(id);
  }

  @ApiOperation({
    summary: "Change a user's role",
    description:
      'Permission model §1.6.2. Every user holds exactly one role. ' +
      '409 cannot_change_own_role | cannot_demote_last_admin | ' +
      'instructor_has_courses; 403 ROLE_EXCEEDS_CALLER when the role, or the ' +
      "user's current one, holds a permission the caller lacks.",
  })
  @RequirePermission('users', 'assign_role')
  @Put(':id/roles')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: RoleChangeResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  @ApiUnprocessableEntityResponse({ description: 'Unknown roleId' })
  setRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserRoleDto,
    @Request() request,
  ): Promise<RoleChangeResponseDto> {
    return this.userRoleChangeService.changeRole(
      request.user.id,
      id,
      dto.roleId,
    );
  }
}
