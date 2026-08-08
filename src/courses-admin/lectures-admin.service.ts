import {
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
import { Lecture } from '../lectures/domain/lecture';
import { CourseAggregatesService } from './course-aggregates.service';
import { CreateLectureAdminDto } from './dto/create-lecture-admin.dto';
import { UpdateLectureAdminDto } from './dto/update-lecture-admin.dto';

@Injectable()
export class LecturesAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
    private readonly courseAggregatesService: CourseAggregatesService,
  ) {}

  async create(
    courseId: Course['id'],
    sectionId: Section['id'],
    dto: CreateLectureAdminDto,
  ) {
    await this.findCourseOrThrow(courseId);
    await this.findSectionInCourseOrThrow(courseId, sectionId);

    const lecture = await this.lecturesService.create({
      section: { id: sectionId },
      title: dto.title,
      description: dto.description,
      lectureType: dto.lectureType,
      durationSecs: dto.durationSecs,
      isPreview: dto.isPreview,
      requiresCompletion: dto.requiresCompletion,
      displayOrder: dto.displayOrder,
      status: 'draft',
    });

    await this.courseAggregatesService.recalculate(courseId);

    return lecture;
  }

  async update(
    courseId: Course['id'],
    sectionId: Section['id'],
    lectureId: Lecture['id'],
    dto: UpdateLectureAdminDto,
  ) {
    await this.findCourseOrThrow(courseId);
    await this.findSectionInCourseOrThrow(courseId, sectionId);
    await this.findLectureInSectionOrThrow(sectionId, lectureId);

    const updated = await this.lecturesService.update(lectureId, dto);

    await this.courseAggregatesService.recalculate(courseId);

    return updated;
  }

  async remove(
    courseId: Course['id'],
    sectionId: Section['id'],
    lectureId: Lecture['id'],
  ): Promise<void> {
    await this.findCourseOrThrow(courseId);
    await this.findSectionInCourseOrThrow(courseId, sectionId);
    await this.findLectureInSectionOrThrow(sectionId, lectureId);

    await this.lecturesService.remove(lectureId);
    await this.courseAggregatesService.recalculate(courseId);
  }

  async reorder(
    courseId: Course['id'],
    sectionId: Section['id'],
    orderedIds: string[],
  ) {
    await this.findCourseOrThrow(courseId);
    await this.findSectionInCourseOrThrow(courseId, sectionId);

    const lectures = await this.lecturesService.findBySectionId(sectionId);
    const currentIds = new Set(lectures.map((lecture) => lecture.id));
    const requestedIds = new Set(orderedIds);

    const isSameSet =
      currentIds.size === requestedIds.size &&
      [...currentIds].every((id) => requestedIds.has(id));

    if (!isSameSet) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { orderedIds: 'mustMatchExistingLectures' },
      });
    }

    for (const [index, id] of orderedIds.entries()) {
      await this.lecturesService.update(id, { displayOrder: index + 1 });
    }

    await this.courseAggregatesService.recalculate(courseId);

    return this.lecturesService.findBySectionId(sectionId);
  }

  async move(
    courseId: Course['id'],
    lectureId: Lecture['id'],
    targetSectionId: Section['id'],
    displayOrder: number,
  ) {
    await this.findCourseOrThrow(courseId);
    const lecture = await this.findLectureInCourseOrThrow(courseId, lectureId);

    const targetSection = await this.sectionsService.findById(targetSectionId);

    if (!targetSection || targetSection.course.id !== courseId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { targetSectionId: 'notExists' },
      });
    }

    const updated = await this.lecturesService.update(lecture.id, {
      section: { id: targetSectionId },
      displayOrder,
    });

    await this.courseAggregatesService.recalculate(courseId);

    return updated;
  }

  private async findLectureInSectionOrThrow(
    sectionId: Section['id'],
    lectureId: Lecture['id'],
  ): Promise<Lecture> {
    const lecture = await this.lecturesService.findById(lectureId);

    if (!lecture || lecture.section.id !== sectionId) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'lectureNotFound',
      });
    }

    return lecture;
  }

  private async findLectureInCourseOrThrow(
    courseId: Course['id'],
    lectureId: Lecture['id'],
  ): Promise<Lecture> {
    const lecture = await this.lecturesService.findById(lectureId);

    if (!lecture || lecture.section.course.id !== courseId) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'lectureNotFound',
      });
    }

    return lecture;
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
