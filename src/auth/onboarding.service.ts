import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AllConfigType } from '../config/config.type';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { StudentCareerInterestEntity } from '../student-career-interests/infrastructure/persistence/relational/entities/student-career-interest.entity';
import { StudentProfileEntity } from '../student-profiles/infrastructure/persistence/relational/entities/student-profile.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthOnboardingDto } from './dto/auth-onboarding.dto';

export const LEARNING_GOAL_GROUP = 'learning_goal';
export const CAREER_INTEREST_GROUP = 'career_interest';
export const EDUCATION_STAGE_GROUP = 'education_stage';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly usersService: UsersService,
    private readonly masterDataCodesService: MasterDataCodesService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly dataSource: DataSource,
  ) {}

  async complete(userId: number, dto: AuthOnboardingDto): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'notFound',
      });
    }

    const maxCareerInterests =
      this.configService.get('app.maxCareerInterests', { infer: true }) ?? 5;

    this.assertCareerInterestShape(dto.careerInterestIds, maxCareerInterests);

    const [educationStageCode, currentStatusCode, careerInterestCodes] =
      await Promise.all([
        this.masterDataCodesService.findById(dto.educationStageCodeId),
        this.masterDataCodesService.findByGroupKeyAndCode(
          LEARNING_GOAL_GROUP,
          dto.currentStatusCode.trim(),
        ),
        this.masterDataCodesService.findByIds(dto.careerInterestIds),
      ]);

    this.assertActiveCode(
      educationStageCode,
      EDUCATION_STAGE_GROUP,
      'educationStageCodeId',
      'notExists',
    );
    this.assertActiveCode(
      currentStatusCode,
      LEARNING_GOAL_GROUP,
      'currentStatusCode',
      'Please select your current status',
    );
    this.assertCareerInterestCodes(dto.careerInterestIds, careerInterestCodes);

    if (!dto.age && !dto.dateOfBirth && !user.age && !user.dateOfBirth) {
      this.fail('age', 'ageOrDateOfBirthRequired');
    }

    // Email is only accepted when the account has none — a Facebook sign-in
    // that skipped the email scope is the whole reason the field is editable
    // on the profile step. Silently ignore an incoming email once the account
    // already has one, so a stale payload cannot overwrite it here.
    const emailToPersist = await this.resolveEmailToPersist(user, dto.email);

    const customStatus = this.customValueForOther(
      currentStatusCode,
      dto.customStatus,
      'customStatus',
      'Please describe your current status',
    );
    const otherCareerInterest = careerInterestCodes.find(
      (code) => code.code.toLowerCase() === 'other',
    );
    const customInterest = otherCareerInterest
      ? this.customValueForOther(
          otherCareerInterest,
          dto.customInterest,
          'customInterest',
          'Please describe your career interest',
        )
      : null;

    // Every onboarding write uses this manager. TypeORM commits only after
    // the final user update succeeds; an exception from any save/delete/update
    // rolls the profile and interests back together.
    await this.dataSource.transaction(async (manager) => {
      const profileRepository = manager.getRepository(StudentProfileEntity);
      const interestRepository = manager.getRepository(
        StudentCareerInterestEntity,
      );
      const userRepository = manager.getRepository(UserEntity);

      const existingProfile = await profileRepository.findOne({
        where: { user: { id: userId } },
      });

      await profileRepository.save(
        profileRepository.create({
          ...existingProfile,
          user: { id: userId },
          educationStageCode: { id: educationStageCode.id },
          currentStatusCode: { id: currentStatusCode.id },
          customStatus,
        }),
      );

      await interestRepository.delete({ user: { id: userId } });
      await interestRepository.save(
        careerInterestCodes.map((code) =>
          interestRepository.create({
            user: { id: userId },
            careerInterest: { id: code.id },
            customInterest:
              code.code.toLowerCase() === 'other' ? customInterest : null,
          }),
        ),
      );

      // Deliberately last: `onboarding_done` can never be true while one of
      // the required profile/interest writes is missing.
      await userRepository.update(userId, {
        age: dto.age ?? user.age,
        dateOfBirth: dto.dateOfBirth ?? user.dateOfBirth,
        // Defense in depth: an email typed here has not been confirmed, so
        // it must not inherit whatever verified state the row had before.
        // In practice `resolveEmailToPersist` only returns a value when the
        // account had no email (and therefore emailVerified: false) yet, so
        // this is redundant today, but a future refactor that clears an
        // email without clearing the flag would silently promote an
        // unverified address here — this line stops that.
        ...(emailToPersist
          ? { email: emailToPersist, emailVerified: false }
          : {}),
        onboardingDone: true,
      });
    });
  }

  private async resolveEmailToPersist(
    user: { email?: string | null },
    incoming: string | undefined,
  ): Promise<string | null> {
    if (user.email || !incoming) return null;

    const email = incoming.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.fail('email', 'emailAlreadyExists');
    }
    return email;
  }

  private assertCareerInterestShape(ids: string[], max: number): void {
    if (!ids.length) {
      this.fail('careerInterestIds', 'Please select at least one interest');
    }
    if (ids.length > max) {
      this.fail('careerInterestIds', `Please select no more than ${max}`);
    }
    if (new Set(ids).size !== ids.length) {
      this.fail(
        'careerInterestIds',
        'Career interests must not contain duplicates',
      );
    }
  }

  private assertCareerInterestCodes(
    ids: string[],
    codes: MasterDataCode[],
  ): void {
    const validIds = new Set(
      codes
        .filter(
          (code) =>
            code.isActive && code.group.groupKey === CAREER_INTEREST_GROUP,
        )
        .map((code) => code.id),
    );
    const invalidId = ids.find((id) => !validIds.has(id));

    if (invalidId) {
      this.fail('careerInterestIds', `notExists:${invalidId}`);
    }
  }

  private assertActiveCode(
    code: MasterDataCode | null,
    groupKey: string,
    field: string,
    message: string,
  ): asserts code is MasterDataCode {
    if (!code || !code.isActive || code.group.groupKey !== groupKey) {
      this.fail(field, message);
    }
  }

  private customValueForOther(
    code: MasterDataCode,
    raw: string | undefined,
    field: string,
    requiredMessage: string,
  ): string | null {
    if (code.code.toLowerCase() !== 'other') {
      return null;
    }

    const value = raw?.trim() ?? '';
    if (!value) {
      this.fail(field, requiredMessage);
    }
    if (value.length > 200) {
      this.fail(field, 'Must be at most 200 characters');
    }
    return value;
  }

  private fail(field: string, message: string): never {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { [field]: message },
    });
  }
}
