import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserRolesService } from '../user-roles/user-roles.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { SessionService } from '../session/session.service';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

/**
 * The Students screen's writes (permission model §1.6).
 *
 * Every write to someone else's account is limited to accounts holding no
 * permission the caller lacks: `users:edit` or `users:delete` on a custom
 * role must not reach an Admin.
 */
@Injectable()
export class UsersAdminService {
  private readonly logger = new Logger(UsersAdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
    private readonly authorizationService: AuthorizationService,
    private readonly sessionService: SessionService,
  ) {}

  /** New accounts are Users; `PUT /admin/users/:id/roles` changes that. */
  async create(dto: CreateUserDto, actorId: number): Promise<User> {
    const user = await this.usersService.create(dto);

    await this.userRolesService.setRole(user.id, RoleEnum.user, actorId);

    return user;
  }

  /** R2 — a learner's profile is theirs; the admin reads it and nothing more. */
  async update(
    actorId: number,
    userId: number,
    dto: AdminUpdateUserDto,
  ): Promise<User | null> {
    await this.findOrThrow(userId);
    await this.assertWithinCaller(actorId, userId);

    const role = await this.authorizationService.roleOf(userId);

    if (role?.id === RoleEnum.user) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'STUDENT_PROFILE_IMMUTABLE',
      });
    }

    return this.usersService.update(userId, dto);
  }

  /**
   * D9 — account state is not profile data, so it applies to learners too.
   * Deactivating ends every session: the refresh token stops working at
   * once, and the access token lapses within its lifetime.
   */
  async setStatus(
    actorId: number,
    userId: number,
    statusId: StatusEnum,
  ): Promise<User | null> {
    if (actorId === userId) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'cannot_change_own_status',
      });
    }

    await this.findOrThrow(userId);
    await this.assertWithinCaller(actorId, userId);

    const updated = await this.usersService.update(userId, {
      status: { id: statusId },
    });

    if (statusId === StatusEnum.deactivated) {
      await this.sessionService.deleteByUserId({ userId });
    }

    this.logger.log(
      `Status change by user ${actorId}: user ${userId} → ${statusId}`,
    );

    return updated;
  }

  async remove(actorId: number, userId: number): Promise<void> {
    if (actorId === userId) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'cannot_delete_self',
      });
    }

    await this.findOrThrow(userId);
    await this.assertWithinCaller(actorId, userId);
    await this.sessionService.deleteByUserId({ userId });
    await this.usersService.remove(userId);
  }

  private async assertWithinCaller(
    actorId: number,
    userId: number,
  ): Promise<void> {
    const [caller, target] = await Promise.all([
      this.authorizationService.permissionsOf(actorId),
      this.authorizationService.permissionsOf(userId),
    ]);
    const callerHas = new Set(caller);

    if (!target.every((key) => callerHas.has(key))) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'ROLE_EXCEEDS_CALLER',
      });
    }
  }

  private async findOrThrow(userId: number): Promise<User> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'userNotFound',
      });
    }

    return user;
  }
}
