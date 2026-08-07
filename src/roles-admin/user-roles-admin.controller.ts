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
import { SetUserRolesDto } from './dto/set-user-roles.dto';
import { Role } from '../roles/domain/role';

@ApiTags('Admin / Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/users',
  version: '1',
})
export class UserRolesAdminController {
  constructor(private readonly userRolesAdminService: UserRolesAdminService) {}

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
    summary: "Replace a user's assigned roles",
    description: 'Sets user_roles to exactly the given roleIds.',
  })
  @RequirePermission('users', 'edit')
  @Put(':id/roles')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: [Role] })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({ description: 'Unknown roleId' })
  setRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserRolesDto,
    @Request() request,
  ): Promise<Role[]> {
    return this.userRolesAdminService.setRolesForUser(
      id,
      dto.roleIds,
      request.user.id,
    );
  }
}
