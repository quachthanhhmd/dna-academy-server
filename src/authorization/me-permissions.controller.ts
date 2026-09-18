import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { AuthorizationService } from './authorization.service';

class RoleRefDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Instructor' })
  name: string;
}

export class MePermissionsDto {
  @ApiPropertyOptional({
    type: () => RoleRefDto,
    nullable: true,
    description: 'For display only. Gate on `permissions`, never on this.',
  })
  role: RoleRefDto | null;

  @ApiProperty({
    type: [String],
    example: ['courses:edit', 'courses:view', 'dashboard:view'],
    description:
      '`module:action`, sorted and deduplicated. Empty means no admin-panel access.',
  })
  permissions: string[];
}

/** Permission model §1.2 — everything the client gates on. */
@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'auth/me/permissions', version: '1' })
export class MePermissionsController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @ApiOperation({
    summary: "The caller's role and permissions",
    description:
      'Read from the database on every call, so a role change shows up ' +
      'without signing in again.',
  })
  @ApiOkResponse({ type: MePermissionsDto })
  @Get()
  @HttpCode(HttpStatus.OK)
  async find(@Request() request): Promise<MePermissionsDto> {
    const [role, permissions] = await Promise.all([
      this.authorizationService.roleOf(request.user.id),
      this.authorizationService.permissionsOf(request.user.id),
    ]);

    return { role, permissions };
  }
}
