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
import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';
import { YoutubeService } from '../youtube/youtube.service';
import { CreateCourseAdminDto } from './dto/create-course-admin.dto';
import { UpdateCourseAdminDto } from './dto/update-course-admin.dto';
import { FindAllCoursesAdminDto } from './dto/find-all-courses-admin.dto';

@Injectable()
export class CoursesAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly masterDataCodesService: MasterDataCodesService,
    private readonly usersService: UsersService,
    private readonly youtubeService: YoutubeService,
  ) {}

  async create(dto: CreateCourseAdminDto, createdByUserId: User['id']) {
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
    const instructor = dto.instructorId
      ? await this.resolveInstructor(dto.instructorId)
      : undefined;

    const slug = await this.generateUniqueSlug(dto.title);

    return this.coursesService.create({
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
      status: 'draft',
      slug,
      level,
      category,
      instructor,
      createdBy: { id: createdByUserId },
      totalSections: 0,
      totalLectures: 0,
      totalDurationSecs: 0,
      totalEnrollments: 0,
    });
  }

  findAllWithFilters(query: FindAllCoursesAdminDto) {
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
      },
      paginationOptions: { page, limit },
    });
  }

  async update(id: Course['id'], dto: UpdateCourseAdminDto) {
    const course = await this.findOrThrow(id);

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
    const instructor =
      dto.instructorId !== undefined
        ? await this.resolveInstructor(dto.instructorId)
        : undefined;

    const payload: Partial<Course> = { ...dto };
    delete (payload as Partial<UpdateCourseAdminDto>).levelId;
    delete (payload as Partial<UpdateCourseAdminDto>).categoryId;
    delete (payload as Partial<UpdateCourseAdminDto>).instructorId;

    if (level !== undefined) {
      payload.level = level;
    }
    if (category !== undefined) {
      payload.category = category;
    }
    if (instructor !== undefined) {
      payload.instructor = instructor;
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

    return this.coursesService.update(id, payload);
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

  private async resolveInstructor(instructorId: number): Promise<User> {
    const user = await this.usersService.findById(instructorId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { instructorId: 'notExists' },
      });
    }

    return user;
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
