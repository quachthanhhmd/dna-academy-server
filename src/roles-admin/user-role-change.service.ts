import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../user-roles/user-roles.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { RoleEnum } from '../roles/roles.enum';
import { UserRoleChangeRepository } from './user-role-change.repository';

export type RoleChangeResult = {
  userId: number;
  role: { id: number; name: string };
  instructorId?: string;
  profileCreated: boolean;
};

/**
 * Permission model §1.6.2 — the only way a user's role changes.
 *
 * Checked before anything is written:
 * - nobody changes their own role;
 * - the caller may only hand out, or take away, permissions they hold
 *   themselves — otherwise `users:assign_role` on a custom role would be
 *   Admin under another name;
 * - the last active Admin cannot be demoted;
 * - an instructor who still teaches cannot stop being one (D10).
 *
 * The role and any instructor profile change commit together.
 */
@Injectable()
export class UserRoleChangeService {
  private readonly logger = new Logger(UserRoleChangeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly userRolesService: UserRolesService,
    private readonly authorizationService: AuthorizationService,
    private readonly repository: UserRoleChangeRepository,
  ) {}

  async changeRole(
    actorId: number,
    userId: number,
    roleId: number,
  ): Promise<RoleChangeResult> {
    if (actorId === userId) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'cannot_change_own_role',
      });
    }

    if (!(await this.usersService.findById(userId))) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'userNotFound',
      });
    }

    const role = await this.rolesService.findById(roleId);

    if (!role) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { roleId: 'notExists' },
      });
    }

    await this.assertWithinCaller(actorId, userId, roleId);

    const [current] = await this.userRolesService.findByUserId(userId);
    const fromRoleId = current?.role.id ?? null;

    const result = await this.dataSource.transaction((em) =>
      this.apply(em, actorId, userId, fromRoleId, {
        id: role.id,
        name: role.name ?? '',
      }),
    );

    if (fromRoleId !== roleId) {
      this.logger.log(
        `Role change by user ${actorId}: user ${userId} ${fromRoleId ?? 'none'} → ${roleId}`,
      );
    }

    return result;
  }

  private async apply(
    em: EntityManager,
    actorId: number,
    userId: number,
    fromRoleId: number | null,
    role: { id: number; name: string },
  ): Promise<RoleChangeResult> {
    const result: RoleChangeResult = {
      userId,
      role,
      profileCreated: false,
    };

    if (fromRoleId === role.id) {
      if (role.id === RoleEnum.instructor) {
        const profile = await this.repository.findProfile(em, userId);
        if (profile) result.instructorId = profile.id;
      }
      return result;
    }

    if (fromRoleId === RoleEnum.admin) {
      const others = (await this.repository.lockActiveAdminIds(em)).filter(
        (id) => id !== userId,
      );

      if (others.length === 0) {
        throw new ConflictException({
          status: HttpStatus.CONFLICT,
          error: 'cannot_demote_last_admin',
        });
      }
    }

    // D10 — leaving Instructor. An Admin who also teaches keeps the profile
    // and its courses: Admin edits every course anyway.
    if (fromRoleId === RoleEnum.instructor && role.id !== RoleEnum.admin) {
      const profile = await this.repository.findProfile(em, userId);

      if (profile) {
        const assignedCoursesCount = await this.repository.countTaughtCourses(
          em,
          profile.id,
        );

        if (assignedCoursesCount > 0) {
          throw new ConflictException({
            status: HttpStatus.CONFLICT,
            error: 'instructor_has_courses',
            assignedCoursesCount,
          });
        }

        await this.repository.setProfileActive(em, profile.id, false);
        result.instructorId = profile.id;
      }
    }

    if (role.id === RoleEnum.instructor) {
      const profile = await this.repository.findProfile(em, userId);

      if (profile) {
        result.instructorId = profile.id;
      } else {
        result.instructorId = await this.repository.createDraftProfile(
          em,
          userId,
          actorId,
        );
        result.profileCreated = true;
      }
    }

    await this.userRolesService.setRole(userId, role.id, actorId, em);

    return result;
  }

  /**
   * The caller must hold every permission of the role being granted, and
   * every permission the target holds now — so no one can create or remove
   * someone more privileged than themselves.
   */
  private async assertWithinCaller(
    actorId: number,
    userId: number,
    roleId: number,
  ): Promise<void> {
    const [caller, granted, held] = await Promise.all([
      this.authorizationService.permissionsOf(actorId),
      this.authorizationService.permissionsOfRole(roleId),
      this.authorizationService.permissionsOf(userId),
    ]);
    const callerHas = new Set(caller);

    if (![...granted, ...held].every((key) => callerHas.has(key))) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: 'ROLE_EXCEEDS_CALLER',
      });
    }
  }
}
