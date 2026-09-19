import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import slugify from 'slugify';
import { InstructorsService } from '../instructors/instructors.service';
import { InstructorExpertisesService } from '../instructor-expertises/instructor-expertises.service';
import { InstructorSocialLinksService } from '../instructor-social-links/instructor-social-links.service';
import { CourseInstructorsService } from '../course-instructors/course-instructors.service';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';
import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';
import { Instructor } from '../instructors/domain/instructor';
import { InstructorStatsService } from './instructor-stats.service';
import { InstructorAccountsService } from './instructor-accounts.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { FindAllInstructorsDto } from './dto/find-all-instructors.dto';
import {
  InstructorCourseDto,
  InstructorCreatedDto,
  InstructorDetailDto,
  InstructorListItemDto,
} from './dto/instructor-response.dto';
import { InstructorProfilesService } from '../instructors/instructor-profiles.service';
import { toInstructorRef } from '../instructors/dto/instructor-profile.dto';
import { InstructorSortField } from '../instructors/infrastructure/persistence/instructor.repository';

export const EXPERTISE_GROUP_KEY = 'expertise_area';
export const INSTRUCTOR_LIST_MAX_LIMIT = 50;

@Injectable()
export class InstructorsAdminService {
  constructor(
    private readonly instructorsService: InstructorsService,
    private readonly instructorExpertisesService: InstructorExpertisesService,
    private readonly instructorSocialLinksService: InstructorSocialLinksService,
    private readonly courseInstructorsService: CourseInstructorsService,
    private readonly masterDataCodesService: MasterDataCodesService,
    private readonly usersService: UsersService,
    private readonly instructorStatsService: InstructorStatsService,
    private readonly instructorProfilesService: InstructorProfilesService,
    private readonly instructorAccounts: InstructorAccountsService,
  ) {}

  async create(
    dto: CreateInstructorDto,
    createdByUserId: User['id'],
  ): Promise<InstructorCreatedDto> {
    const accountEmail = dto.createAccount
      ? await this.assertAccountEmailAvailable(dto)
      : null;

    // Validate everything that can be rejected before writing a single row —
    // there is no transaction spanning the profile's side tables below.
    const expertiseCodes = await this.resolveExpertiseCodes(
      dto.expertiseCodeIds,
    );
    const user = accountEmail
      ? null
      : await this.resolveUserLink(dto.userId ?? null, null);

    const slug = dto.slug
      ? await this.assertSlugAvailable(dto.slug, null)
      : await this.generateUniqueSlug(dto.fullName);

    const profile: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'> = {
      user,
      createdBy: { id: createdByUserId } as User,
      slug,
      fullName: dto.fullName,
      headline: dto.headline ?? null,
      bio: dto.bio ?? null,
      profilePictureUrl: dto.profilePictureUrl ?? null,
      emailPublic: dto.emailPublic ?? null,
      yearsOfExperience: dto.yearsOfExperience ?? null,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 0,
      totalCourses: 0,
      totalStudents: 0,
      avgRating: null,
    };

    const { instructorId, account } = accountEmail
      ? await this.instructorAccounts.createWithAccount(
          profile,
          accountEmail,
          createdByUserId,
        )
      : {
          instructorId: (await this.instructorsService.create(profile)).id,
          account: null,
        };

    await this.replaceExpertise(instructorId, expertiseCodes);
    await this.replaceSocialLinks(instructorId, dto.socialLinks);

    // After the commit: an email for a rolled-back account would be worse
    // than a missing one, which can be resent (§2.9).
    const inviteSent =
      account && dto.sendInvite !== false
        ? await this.instructorAccounts.sendInvite(account)
        : false;

    return { ...(await this.findOne(instructorId)), inviteSent };
  }

  /** §1.7 — `POST /admin/instructors/:id/invite`. */
  async resendInvite(id: Instructor['id']): Promise<void> {
    const instructor = await this.findOrThrow(id);

    if (!instructor.user) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'no_linked_account',
      });
    }

    if (instructor.user.password) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'already_activated',
      });
    }

    await this.instructorAccounts.sendInvite(instructor.user, {
      throwOnFailure: true,
    });
  }

  private async assertAccountEmailAvailable(
    dto: CreateInstructorDto,
  ): Promise<string> {
    if (!dto.accountEmail) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { accountEmail: 'required' },
      });
    }

    if (dto.userId !== undefined && dto.userId !== null) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { userId: 'conflictsWithCreateAccount' },
      });
    }

    // To give an existing account a profile, change its role instead
    // (§1.6.2) — that keeps its password and its history.
    if (await this.usersService.findByEmail(dto.accountEmail)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { accountEmail: 'emailAlreadyExists' },
      });
    }

    return dto.accountEmail;
  }

  async findAll(query: FindAllInstructorsDto): Promise<{
    data: InstructorListItemDto[];
    totalCount: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, INSTRUCTOR_LIST_MAX_LIMIT);

    const { data, total } = await this.instructorsService.findAllWithPagination(
      {
        filterOptions: {
          search: query.q || undefined,
          isActive:
            query.status === 'active'
              ? true
              : query.status === 'inactive'
                ? false
                : undefined,
          expertiseCodeId: query.expertiseId,
        },
        sortOptions: {
          field: (query.sortBy ?? 'displayOrder') as InstructorSortField,
          order: query.sortOrder === 'desc' ? 'DESC' : 'ASC',
        },
        paginationOptions: { page, limit },
      },
    );

    return {
      data: data.map((instructor) => this.toListItem(instructor)),
      totalCount: total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  async findOne(id: Instructor['id']): Promise<InstructorDetailDto> {
    const instructor = await this.findOrThrow(id);

    const [expertise, socialLinks, stats] = await Promise.all([
      this.instructorProfilesService.findExpertise(id),
      this.instructorProfilesService.findSocialLinks(id),
      this.instructorStatsService.recompute(id),
    ]);

    return {
      ...this.toListItem(instructor),
      // The counters on the row we loaded predate the recompute above.
      totalCourses: stats.totalCourses,
      totalStudents: stats.totalStudents,
      avgRating: stats.avgRating,
      userId: instructor.user?.id ?? null,
      bio: instructor.bio ?? null,
      emailPublic: instructor.emailPublic ?? null,
      yearsOfExperience: instructor.yearsOfExperience ?? null,
      expertise,
      socialLinks,
      stats: {
        totalCourses: stats.totalCourses,
        totalStudents: stats.totalStudents,
        avgRating: stats.avgRating,
      },
      createdAt: instructor.createdAt,
      updatedAt: instructor.updatedAt,
    };
  }

  async update(
    id: Instructor['id'],
    dto: UpdateInstructorDto,
  ): Promise<InstructorDetailDto> {
    const instructor = await this.findOrThrow(id);

    const expertiseCodes =
      dto.expertiseCodeIds !== undefined
        ? await this.resolveExpertiseCodes(dto.expertiseCodeIds)
        : undefined;

    const user =
      dto.userId !== undefined
        ? await this.resolveUserLink(dto.userId, id)
        : undefined;

    let slug: string | undefined;
    if (dto.slug !== undefined && dto.slug !== instructor.slug) {
      await this.assertSlugUnlocked(id);
      slug = await this.assertSlugAvailable(dto.slug, id);
    }

    const payload: Partial<Instructor> = {
      slug,
      fullName: dto.fullName,
      headline: dto.headline,
      bio: dto.bio,
      profilePictureUrl: dto.profilePictureUrl,
      emailPublic: dto.emailPublic,
      yearsOfExperience: dto.yearsOfExperience,
      isActive: dto.isActive,
      displayOrder: dto.displayOrder,
      user,
    };

    // A partial DTO instance carries every declared field as an own property,
    // undefined for anything the client omitted. Strip those so the
    // repository's `{ ...current, ...payload }` merge cannot clobber columns.
    for (const key of Object.keys(payload) as (keyof Instructor)[]) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    await this.instructorsService.update(id, payload);

    if (expertiseCodes !== undefined) {
      await this.replaceExpertise(id, expertiseCodes);
    }

    if (dto.socialLinks !== undefined) {
      await this.replaceSocialLinks(id, dto.socialLinks);
    }

    return this.findOne(id);
  }

  async updateStatus(
    id: Instructor['id'],
    isActive: boolean,
  ): Promise<InstructorDetailDto> {
    await this.findOrThrow(id);

    // Deliberately does not touch course_instructor: an instructor who leaves
    // keeps their name on the courses they already taught (Epic 5 AC-4).
    await this.instructorsService.update(id, { isActive });

    return this.findOne(id);
  }

  async linkUser(
    id: Instructor['id'],
    userId: number | null,
  ): Promise<InstructorDetailDto> {
    await this.findOrThrow(id);

    const user = await this.resolveUserLink(userId, id);
    await this.instructorsService.update(id, { user });

    return this.findOne(id);
  }

  async remove(id: Instructor['id']): Promise<void> {
    await this.findOrThrow(id);

    const assignedCoursesCount =
      await this.courseInstructorsService.countByInstructorId(id);

    if (assignedCoursesCount > 0) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'has_assigned_courses',
        assignedCoursesCount,
      });
    }

    await this.instructorExpertisesService.removeByInstructorId(id);
    await this.instructorSocialLinksService.removeByInstructorId(id);
    await this.instructorsService.remove(id);
  }

  async findCourses(id: Instructor['id']): Promise<InstructorCourseDto[]> {
    await this.findOrThrow(id);

    const assignments =
      await this.courseInstructorsService.findByInstructorId(id);

    return assignments.map((assignment) => ({
      id: assignment.course.id,
      title: assignment.course.title,
      slug: assignment.course.slug,
      status: assignment.course.status,
      role: assignment.role,
      totalEnrollments: assignment.course.totalEnrollments ?? 0,
    }));
  }

  getStats(id: Instructor['id']) {
    return this.instructorStatsService.recompute(id);
  }

  private toListItem(instructor: Instructor): InstructorListItemDto {
    return {
      ...toInstructorRef(instructor),
      hasAccount: Boolean(instructor.user),
      accountActivated: Boolean(instructor.user?.password),
      isActive: instructor.isActive,
      displayOrder: instructor.displayOrder,
      totalCourses: instructor.totalCourses ?? 0,
      totalStudents: instructor.totalStudents ?? 0,
      avgRating: instructor.avgRating ?? null,
    };
  }

  private async replaceExpertise(
    instructorId: Instructor['id'],
    codes?: MasterDataCode[],
  ): Promise<void> {
    if (codes === undefined) {
      return;
    }

    await this.instructorExpertisesService.removeByInstructorId(instructorId);

    for (const expertiseCode of codes) {
      await this.instructorExpertisesService.create({
        instructor: { id: instructorId } as Instructor,
        expertiseCode,
      });
    }
  }

  private async replaceSocialLinks(
    instructorId: Instructor['id'],
    links?: { platform: string; url: string; displayOrder?: number }[],
  ): Promise<void> {
    if (links === undefined) {
      return;
    }

    await this.instructorSocialLinksService.removeByInstructorId(instructorId);

    for (const [index, link] of links.entries()) {
      await this.instructorSocialLinksService.create({
        instructor: { id: instructorId } as Instructor,
        platform: link.platform as never,
        url: link.url,
        displayOrder: link.displayOrder ?? index,
      });
    }
  }

  private async resolveExpertiseCodes(
    ids?: string[],
  ): Promise<MasterDataCode[] | undefined> {
    if (ids === undefined) {
      return undefined;
    }

    const codes: MasterDataCode[] = [];

    for (const id of ids) {
      const code = await this.masterDataCodesService.findById(id);

      if (
        !code ||
        !code.isActive ||
        code.group.groupKey !== EXPERTISE_GROUP_KEY
      ) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { expertiseCodeIds: `notExists:${id}` },
        });
      }

      codes.push(code);
    }

    return codes;
  }

  /**
   * Resolves the optional users link. `null` means "unlink"; a value means
   * "link", which is rejected when another instructor already holds that user.
   */
  private async resolveUserLink(
    userId: number | null,
    currentInstructorId: Instructor['id'] | null,
  ): Promise<User | null> {
    if (userId === null) {
      return null;
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { userId: 'notExists' },
      });
    }

    const existing = await this.instructorsService.findByUserId(userId);

    if (existing && existing.id !== currentInstructorId) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'user_already_linked',
        instructorId: existing.id,
      });
    }

    return user;
  }

  private async assertSlugAvailable(
    slug: string,
    currentInstructorId: Instructor['id'] | null,
  ): Promise<string> {
    const existing = await this.instructorsService.findBySlug(slug);

    if (existing && existing.id !== currentInstructorId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { slug: 'alreadyExists' },
      });
    }

    return slug;
  }

  /**
   * A published course exposes the instructor slug in URLs and cached pages,
   * so once one exists the slug is frozen (Epic 5 §2.2.3).
   */
  private async assertSlugUnlocked(id: Instructor['id']): Promise<void> {
    const assignments =
      await this.courseInstructorsService.findByInstructorId(id);

    const publishedCount = assignments.filter(
      (assignment) => assignment.course.status === 'published',
    ).length;

    if (publishedCount > 0) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        error: 'slug_locked',
        publishedCoursesCount: publishedCount,
      });
    }
  }

  private async generateUniqueSlug(fullName: string): Promise<string> {
    // `strict` drops anything that is not [a-z0-9-] after slugify's charmap
    // has folded the Vietnamese diacritics, so "Nguyễn Văn A" → "nguyen-van-a".
    const base =
      slugify(fullName, { lower: true, strict: true }) || 'instructor';
    let candidate = base;
    let suffix = 2;

    while (await this.instructorsService.findBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async findOrThrow(id: Instructor['id']): Promise<Instructor> {
    const instructor = await this.instructorsService.findById(id);

    if (!instructor) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'instructorNotFound',
      });
    }

    return instructor;
  }
}
