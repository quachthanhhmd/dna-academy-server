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

export const VIDEO_LECTURE_TYPE = 'video';

/**
 * Epic 4.2 §3.4 — BUG-09. Every lecture in the imported MIT course showed the
 * same 1:15:00 because the import script typed the value once.
 *
 * The duration cannot be derived: YouTube's oEmbed endpoint returns title,
 * author and thumbnail but not length. So V1 keeps it admin-entered and only
 * refuses the value that is certainly wrong — a video that claims to last no
 * time at all. A wrong-but-positive duration still gets through; catching that
 * needs the YouTube Data API, which §3.4 defers to V1.1.
 */
const assertVideoDuration = (lecture: {
  lectureType?: string;
  durationSecs?: number;
}): void => {
  if (
    lecture.lectureType === VIDEO_LECTURE_TYPE &&
    !(Number(lecture.durationSecs) > 0)
  ) {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { durationSecs: 'requiredForVideo' },
    });
  }
};

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

    assertVideoDuration(dto);

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
    const current = await this.findLectureInSectionOrThrow(
      sectionId,
      lectureId,
    );

    // The rule spans two fields, so the patch is judged on the row it will
    // produce: sending only `lectureType: 'video'` must not slip a
    // zero-duration row past by looking harmless on its own.
    assertVideoDuration({
      lectureType: dto.lectureType ?? current?.lectureType,
      durationSecs: dto.durationSecs ?? current?.durationSecs,
    });

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
