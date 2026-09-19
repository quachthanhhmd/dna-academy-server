import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_METADATA_KEY,
  RequiredPermission,
} from './authorization.constants';
import { AuthorizationService } from './authorization.service';

/**
 * Enforces `@RequirePermission(module, action)` against the database on every
 * request (permission model §2.5). It never reads a role from the token, so a
 * demoted admin loses access on their next request.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<
      RequiredPermission | undefined
    >(PERMISSION_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true;
    }

    const userId = context.switchToHttp().getRequest().user?.id;

    if (
      userId &&
      (await this.authorizationService.hasPermission(
        userId,
        required.module,
        required.action,
      ))
    ) {
      return true;
    }

    throw new ForbiddenException({
      code: 'PERMISSION_DENIED',
      required,
    });
  }
}
