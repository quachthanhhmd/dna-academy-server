import {
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import bcrypt from 'bcryptjs';
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
 * does. Without an admin-set password the account is stored without one —
 * login already refuses that — until the invitee sets it through the
 * single-use invite. With one, the account is usable immediately and no
 * invite is sent, which the caller decides.
 *
 * `attachAccount` is the same operation for a profile that already exists —
 * an edit giving a login to an instructor who had none — where the account
 * and its role are still created in one transaction, with the profile linked
 * rather than inserted.
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
    /** Plaintext from the admin form; hashed here and never stored as-is. */
    password?: string,
  ): Promise<{ instructorId: string; account: InviteTarget }> {
    try {
      return await this.dataSource.transaction(async (em) => {
        const account = await this.createAccountUser(em, {
          email,
          fullName: profile.fullName,
          createdById,
          password,
        });

        const instructors = em.getRepository(InstructorEntity);
        const instructor = await instructors.save(
          instructors.create(
            InstructorMapper.toPersistence({
              ...profile,
              user: { id: account.id } as User,
            } as Instructor),
          ),
        );

        this.logger.log(
          `Instructor account created by user ${createdById}: user ${account.id}, instructor ${instructor.id}`,
        );

        return { instructorId: instructor.id, account };
      });
    } catch (error) {
      this.throwIfEmailTaken(error);
      throw error;
    }
  }

  /**
   * Gives an existing instructor a login account — the mirror of
   * `createWithAccount` for a profile that already exists: same user shape,
   * same hashing, same role, but the profile is linked instead of inserted.
   *
   * A password is required because that is the only reason this is called:
   * the edit form's admin is setting one. Without a password the account
   * would be unusable until an invite, and inviting from an edit is not a
   * path this service offers.
   */
  async attachAccount(
    instructorId: Instructor['id'],
    fullName: string,
    email: string,
    createdById: number,
    password: string,
  ): Promise<InviteTarget> {
    try {
      return await this.dataSource.transaction(async (em) => {
        const account = await this.createAccountUser(em, {
          email,
          fullName,
          createdById,
          password,
        });

        await em
          .getRepository(InstructorEntity)
          .update(instructorId, { user: { id: account.id } as User });

        this.logger.log(
          `Instructor ${instructorId} given an account by user ${createdById}: user ${account.id}`,
        );

        return account;
      });
    } catch (error) {
      this.throwIfEmailTaken(error);
      throw error;
    }
  }

  /**
   * The account row and its role, shared by both paths so a profile created
   * with a login and one given a login later cannot drift apart.
   */
  private async createAccountUser(
    em: EntityManager,
    fields: {
      email: string;
      fullName: string;
      createdById: number;
      password?: string;
    },
  ): Promise<InviteTarget> {
    // Same hashing as users.service: an admin-set password must be
    // indistinguishable from one the invitee would have chosen.
    const hashedPassword = fields.password
      ? await bcrypt.hash(fields.password, await bcrypt.genSalt())
      : null;

    const users = em.getRepository(UserEntity);
    const user = await users.save(
      users.create({
        email: fields.email,
        fullName: fields.fullName,
        password: hashedPassword,
        provider: AuthProvidersEnum.email,
        // An admin setting a password does not prove the address is real.
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
      fields.createdById,
      em,
    );

    return { id: user.id, email: fields.email, password: hashedPassword };
  }

  /** Someone registered the address between the check and the insert. */
  private throwIfEmailTaken(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { code?: string }).code === '23505'
    ) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { accountEmail: 'emailAlreadyExists' },
      });
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
