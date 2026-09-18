import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import slugify from 'slugify';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';
import { User } from '../users/domain/user';
import { CourseInstructorsAdminService } from './course-instructors-admin.service';
import { YoutubeService } from '../youtube/youtube.service';
import { CreateCourseAdminDto } from './dto/create-course-admin.dto';
import { UpdateCourseAdminDto } from './dto/update-course-admin.dto';
import { FindAllCoursesAdminDto } from './dto/find-all-courses-admin.dto';

@Injectable()
export class CoursesAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly masterDataCodesService: MasterDataCodesService,
    private readonly youtubeService: YoutubeService,
    private readonly courseInstructorsAdminService: CourseInstructorsAdminService,
  ) {}

  async create(dto: CreateCourseAdminDto, createdByUserId: User['id']) {
    await this.assertCourseIdAvailable(dto.courseId);

    if (dto.introVideoUrl) {
      await this.youtubeService.validateAndExtractVideoId(dto.introVideoUrl);
    }

    const level = dto.levelId
      ? await this.resolveMasterDataCode(dto.levelId, 'course_level', 'levelId')
      : undefined;
    const category = dto.categoryId
      ? await this.resolveMasterDataCode(
          dto.categoryId,
          'course_category',
          'categoryId',
        )
      : undefined;
    // Validated before the course row is written so a bad instructor payload
    // cannot leave an orphaned draft behind.
    await this.courseInstructorsAdminService.validateAssignable({
      primaryInstructorId: dto.primaryInstructorId,
      coInstructorIds: dto.coInstructorIds,
    });

    const slug = await this.generateUniqueSlug(dto.title);

    const course = await this.coursesService.create({
      courseId: dto.courseId,
      title: dto.title,
      shortDescription: dto.shortDescription,
      fullDescription: dto.fullDescription,
      thumbnailUrl: dto.thumbnailUrl,
      introVideoUrl: dto.introVideoUrl,
      language: dto.language,
      price: dto.price,
      isFree: dto.price === 0,
      hasCertificate: dto.hasCertificate,
      enrollmentOpen: dto.enrollmentOpen,
      // Epic 4 v2 §2.1 — drives SequentialLockService in the player.
      requiresSequentialCompletion: dto.requiresSequentialCompletion ?? false,
      status: 'draft',
      slug,
      level,
      category,
      createdBy: { id: createdByUserId },
      totalSections: 0,
      totalLectures: 0,
      totalDurationSecs: 0,
      totalEnrollments: 0,
    });

    await this.courseInstructorsAdminService.assign(course.id, {
      primaryInstructorId: dto.primaryInstructorId,
      coInstructorIds: dto.coInstructorIds,
    });

    return course;
  }

  findAllWithFilters(query: FindAllCoursesAdminDto, courseIds?: string[]) {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return this.coursesService.findAllWithPagination({
      filterOptions: {
        status: query?.status,
        levelId: query?.levelId,
        categoryId: query?.categoryId,
        instructorId: query?.instructorId,
        courseIds,
      },
      paginationOptions: { page, limit },
    });
  }

  async update(id: Course['id'], dto: UpdateCourseAdminDto) {
    const course = await this.findOrThrow(id);

    if (dto.courseId !== undefined && dto.courseId !== course.courseId) {
      await this.assertCourseIdAvailable(dto.courseId);
    }

    if (dto.introVideoUrl && dto.introVideoUrl !== course.introVideoUrl) {
      await this.youtubeService.validateAndExtractVideoId(dto.introVideoUrl);
    }

    const level =
      dto.levelId !== undefined
        ? await this.resolveMasterDataCode(
            dto.levelId,
            'course_level',
            'levelId',
          )
        : undefined;
    const category =
      dto.categoryId !== undefined
        ? await this.resolveMasterDataCode(
            dto.categoryId,
            'course_category',
            'categoryId',
          )
        : undefined;
    const payload: Partial<Course> = { ...dto };
    delete (payload as Partial<UpdateCourseAdminDto>).levelId;
    delete (payload as Partial<UpdateCourseAdminDto>).categoryId;
    delete (payload as Partial<UpdateCourseAdminDto>).primaryInstructorId;
    delete (payload as Partial<UpdateCourseAdminDto>).coInstructorIds;

    if (level !== undefined) {
      payload.level = level;
    }
    if (category !== undefined) {
      payload.category = category;
    }
    if (dto.price !== undefined) {
      payload.isFree = dto.price === 0;
    }

    // The DTO instance carries every declared field as an own property, set
    // to undefined for anything the client omitted. Drop those keys so the
    // repository's `{ ...current, ...payload }` merge can't clobber existing
    // values with undefined.
    for (const key of Object.keys(payload) as (keyof Course)[]) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    const updated = await this.coursesService.update(id, payload);

    await this.courseInstructorsAdminService.assign(id, {
      primaryInstructorId: dto.primaryInstructorId,
      coInstructorIds: dto.coInstructorIds,
    });

    return updated;
  }

  private async assertCourseIdAvailable(courseId: string): Promise<void> {
    const existing = await this.coursesService.findByCourseId(courseId);

    if (existing) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { courseId: 'alreadyExists' },
      });
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let candidate = base;
    let suffix = 2;

    while (await this.coursesService.findBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async resolveMasterDataCode(
    id: string,
    groupKey: string,
    field: string,
  ): Promise<MasterDataCode> {
    const code = await this.masterDataCodesService.findById(id);

    if (!code || !code.isActive || code.group.groupKey !== groupKey) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { [field]: 'notExists' },
      });
    }

    return code;
  }

  private async findOrThrow(id: Course['id']): Promise<Course> {
    const course = await this.coursesService.findById(id);

    if (!course) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'courseNotFound',
      });
    }

    return course;
  }
}
