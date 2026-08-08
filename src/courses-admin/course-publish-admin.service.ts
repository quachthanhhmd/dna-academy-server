import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { SectionsService } from '../sections/sections.service';
import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import { LectureContentVideosService } from '../lecture-content-videos/lecture-content-videos.service';
import { LectureContentArticlesService } from '../lecture-content-articles/lecture-content-articles.service';
import { LectureContentDocumentsService } from '../lecture-content-documents/lecture-content-documents.service';
import { LectureContentQuizzesService } from '../lecture-content-quizzes/lecture-content-quizzes.service';
import { LectureContentReflectionsService } from '../lecture-content-reflections/lecture-content-reflections.service';
import { User } from '../users/domain/user';

@Injectable()
export class CoursePublishAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
    private readonly lectureContentVideosService: LectureContentVideosService,
    private readonly lectureContentArticlesService: LectureContentArticlesService,
    private readonly lectureContentDocumentsService: LectureContentDocumentsService,
    private readonly lectureContentQuizzesService: LectureContentQuizzesService,
    private readonly lectureContentReflectionsService: LectureContentReflectionsService,
  ) {}

  async publish(courseId: Course['id'], userId: User['id']) {
    const course = await this.findOrThrow(courseId);
    const missingItems = await this.validateChecklist(course);

    if (missingItems.length) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        missingItems,
      });
    }

    const updated = await this.coursesService.update(courseId, {
      status: 'published',
      publishedAt: new Date(),
      publishedBy: { id: userId },
    });

    // Spread to a plain object: Course has unconditional @Exclude on
    // publishedAt/publishedBy, which only ClassSerializerInterceptor strips
    // off a class instance, not a plain object.
    return { ...updated };
  }

  async unpublish(courseId: Course['id']) {
    await this.findOrThrow(courseId);

    const updated = await this.coursesService.update(courseId, {
      status: 'unpublished',
    });

    return { ...updated };
  }

  private async validateChecklist(course: Course): Promise<string[]> {
    const missingItems: string[] = [];

    if (!course.title) missingItems.push('title');
    if (!course.shortDescription) missingItems.push('shortDescription');
    if (!course.thumbnailUrl) missingItems.push('thumbnailUrl');
    if (!course.level) missingItems.push('levelId');
    if (!course.category) missingItems.push('categoryId');

    const sections = await this.sectionsService.findByCourseId(course.id);
    const lecturesPerSection = await Promise.all(
      sections.map((section) =>
        this.lecturesService.findBySectionId(section.id),
      ),
    );
    const lectures = lecturesPerSection.flat();

    if (!lectures.length) {
      missingItems.push('curriculum');
    } else {
      const hasContentResults = await Promise.all(
        lectures.map((lecture) => this.lectureHasContent(lecture)),
      );

      if (hasContentResults.some((hasContent) => !hasContent)) {
        missingItems.push('lectureContent');
      }
    }

    return missingItems;
  }

  private async lectureHasContent(lecture: Lecture): Promise<boolean> {
    switch (lecture.lectureType) {
      case 'video':
        return !!(await this.lectureContentVideosService.findByLectureId(
          lecture.id,
        ));
      case 'article':
        return !!(await this.lectureContentArticlesService.findByLectureId(
          lecture.id,
        ));
      case 'pdf_document':
        return !!(await this.lectureContentDocumentsService.findByLectureId(
          lecture.id,
        ));
      case 'quiz':
        return !!(await this.lectureContentQuizzesService.findByLectureId(
          lecture.id,
        ));
      case 'reflection':
        return !!(await this.lectureContentReflectionsService.findByLectureId(
          lecture.id,
        ));
      default:
        return false;
    }
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
