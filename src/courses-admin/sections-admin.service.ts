import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { SectionsService } from '../sections/sections.service';
import { Section } from '../sections/domain/section';
import { LecturesService } from '../lectures/lectures.service';
import { CourseAggregatesService } from './course-aggregates.service';
import { LecturesAdminService } from './lectures-admin.service';
import { CreateSectionAdminDto } from './dto/create-section-admin.dto';
import { UpdateSectionAdminDto } from './dto/update-section-admin.dto';

@Injectable()
export class SectionsAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
    private readonly courseAggregatesService: CourseAggregatesService,
    private readonly lecturesAdminService: LecturesAdminService,
  ) {}

  async create(courseId: Course['id'], dto: CreateSectionAdminDto) {
    await this.findCourseOrThrow(courseId);

    const section = await this.sectionsService.create({
      course: { id: courseId },
      title: dto.title,
      description: dto.description,
      learningObjective: dto.learningObjective,
      displayOrder: dto.displayOrder,
    });

    await this.courseAggregatesService.recalculate(courseId);

    return section;
  }

  async findAllForCourse(courseId: Course['id']) {
    await this.findCourseOrThrow(courseId);

    return this.sectionsService.findByCourseId(courseId);
  }

  async update(
    courseId: Course['id'],
    sectionId: Section['id'],
    dto: UpdateSectionAdminDto,
  ) {
    await this.findCourseOrThrow(courseId);
    await this.findSectionInCourseOrThrow(courseId, sectionId);

    return this.sectionsService.update(sectionId, dto);
  }

  async remove(
    courseId: Course['id'],
    sectionId: Section['id'],
    force: boolean,
  ): Promise<void> {
    await this.findCourseOrThrow(courseId);
    await this.findSectionInCourseOrThrow(courseId, sectionId);

    const lectureCount = await this.lecturesService.countBySectionId(sectionId);

    if (lectureCount > 0) {
      if (!force) {
        throw new ConflictException({
          status: HttpStatus.CONFLICT,
          code: 'SECTION_HAS_LECTURES',
        });
      }

      // Same path as deleting a lecture on its own: content rows reference
      // the lecture, so a bulk delete of the lectures alone is a foreign-key
      // violation, and a lecture with learner data is refused rather than
      // taken down with the section.
      await this.lecturesAdminService.deleteLecturesOfSection(sectionId);
    }

    await this.sectionsService.remove(sectionId);
    await this.courseAggregatesService.recalculate(courseId);
  }

  async reorder(courseId: Course['id'], orderedIds: string[]) {
    await this.findCourseOrThrow(courseId);

    const sections = await this.sectionsService.findByCourseId(courseId);
    const currentIds = new Set(sections.map((section) => section.id));
    const requestedIds = new Set(orderedIds);

    const isSameSet =
      currentIds.size === requestedIds.size &&
      [...currentIds].every((id) => requestedIds.has(id));

    if (!isSameSet) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { orderedIds: 'mustMatchExistingSections' },
      });
    }

    for (const [index, id] of orderedIds.entries()) {
      await this.sectionsService.update(id, { displayOrder: index + 1 });
    }

    await this.courseAggregatesService.recalculate(courseId);

    return this.sectionsService.findByCourseId(courseId);
  }

  private async findSectionInCourseOrThrow(
    courseId: Course['id'],
    sectionId: Section['id'],
  ): Promise<Section> {
    const section = await this.sectionsService.findById(sectionId);

    if (!section || section.course.id !== courseId) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'sectionNotFound',
      });
    }

    return section;
  }

  private async findCourseOrThrow(id: Course['id']): Promise<Course> {
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
