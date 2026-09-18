import {
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { AuthProvidersEnum } from '../auth/auth-providers.enum';
import { Instructor } from '../instructors/domain/instructor';
import { InstructorEntity } from '../instructors/infrastructure/persistence/relational/entities/instructor.entity';
import { InstructorMapper } from '../instructors/infrastructure/persistence/relational/mappers/instructor.mapper';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { User } from '../users/domain/user';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { UserRolesService } from '../user-roles/user-roles.service';

type InviteTarget = Pick<User, 'id' | 'email' | 'password'>;

/**
 * Permission model §2.9 (BE-13) — login accounts for instructors.
 *
 * The account, its role and the profile are written in one transaction:
 * either an instructor who can be invited exists afterwards, or nothing
 * does. The account has no password — login already refuses one — until the
 * invitee sets it through the single-use invite.
 */
@Injectable()
export class InstructorAccountsService {
  private readonly logger = new Logger(InstructorAccountsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userRolesService: UserRolesService,
    private readonly authService: AuthService,
  ) {}

  async createWithAccount(
    profile: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>,
    email: string,
    createdById: number,
  ): Promise<{ instructorId: string; account: InviteTarget }> {
    try {
      return await this.dataSource.transaction(async (em) => {
        const users = em.getRepository(UserEntity);
        const user = await users.save(
          users.create({
            email,
            fullName: profile.fullName,
            password: null,
            provider: AuthProvidersEnum.email,
            emailVerified: false,
            // Onboarding is the learner questionnaire; a teaching account
            // has nothing to answer there.
            onboardingDone: true,
            status: { id: StatusEnum.active },
          }),
        );

        await this.userRolesService.setRole(
          user.id,
          RoleEnum.instructor,
          createdById,
          em,
        );

        const instructors = em.getRepository(InstructorEntity);
        const instructor = await instructors.save(
          instructors.create(
            InstructorMapper.toPersistence({
              ...profile,
              user: { id: user.id } as User,
            } as Instructor),
          ),
        );

        this.logger.log(
          `Instructor account created by user ${createdById}: user ${user.id}, instructor ${instructor.id}`,
        );

        return {
          instructorId: instructor.id,
          account: { id: user.id, email, password: null },
        };
      });
    } catch (error) {
      // Someone registered the address between the check and the insert.
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { accountEmail: 'emailAlreadyExists' },
        });
      }
      throw error;
    }
  }

  /**
   * Sends the invite. On create a failure is reported as `inviteSent: false`
   * — the account exists and the email can be resent; on an explicit resend
   * it is an error the caller should see.
   */
  async sendInvite(
    user: InviteTarget,
    options: { throwOnFailure?: boolean } = {},
  ): Promise<boolean> {
    try {
      await this.authService.sendPasswordInvite(user);
      return true;
    } catch (error) {
      this.logger.error(`Invite to user ${user.id} failed`, error);

      if (options.throwOnFailure) {
        throw new ServiceUnavailableException({
          status: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'invite_not_sent',
        });
      }
      return false;
    }
  }
}
