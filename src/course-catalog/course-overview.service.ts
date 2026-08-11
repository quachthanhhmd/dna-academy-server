import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { SectionsService } from '../sections/sections.service';
import { LecturesService } from '../lectures/lectures.service';
import { CourseLearningOutcomesService } from '../course-learning-outcomes/course-learning-outcomes.service';
import { CourseRequirementsService } from '../course-requirements/course-requirements.service';
import { CourseTargetLearnersService } from '../course-target-learners/course-target-learners.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { CourseOverviewDto } from './dto/course-overview.dto';

@Injectable()
export class CourseOverviewService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
    private readonly courseLearningOutcomesService: CourseLearningOutcomesService,
    private readonly courseRequirementsService: CourseRequirementsService,
    private readonly courseTargetLearnersService: CourseTargetLearnersService,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  /**
   * Public course overview. `studentId` is optional — when the caller sent a
   * valid JWT we attach their enrollment state, otherwise the course is
   * returned exactly as an anonymous visitor sees it.
   */
  async findPublishedBySlug(
    slug: string,
    studentId?: number,
  ): Promise<CourseOverviewDto> {
    const course = await this.findVisibleCourse(slug);

    const [
      sections,
      learningOutcomes,
      requirements,
      targetLearners,
      groupAssignments,
      enrollment,
    ] = await Promise.all([
      this.sectionsService.findByCourseId(course.id),
      this.courseLearningOutcomesService.findByCourseId(course.id),
      this.courseRequirementsService.findByCourseId(course.id),
      this.courseTargetLearnersService.findByCourseId(course.id),
      this.courseGroupAssignmentsService.findByCourseId(course.id),
      studentId
        ? this.enrollmentsService.findByStudentAndCourse(studentId, course.id)
        : Promise.resolve(null),
    ]);

    const curriculum = await Promise.all(
      sections.map(async (section) => {
        const lectures = await this.lecturesService.findBySectionId(section.id);

        return {
          id: section.id,
          title: section.title,
          displayOrder: section.displayOrder,
          // Titles, types and durations are public for every lecture; the
          // content URLs live in the lecture-content tables and are simply
          // never joined here, so a non-enrolled visitor cannot reach them.
          lectures: lectures.map((lecture) => ({
            id: lecture.id,
            title: lecture.title,
            lectureType: lecture.lectureType,
            durationSecs: lecture.durationSecs,
            isPreview: lecture.isPreview,
            displayOrder: lecture.displayOrder,
          })),
        };
      }),
    );

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription ?? null,
      fullDescription: course.fullDescription ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      introVideoUrl: course.introVideoUrl ?? null,
      instructor: course.instructor
        ? {
            id: course.instructor.id,
            fullName: course.instructor.fullName ?? null,
            profilePictureUrl: course.instructor.profilePictureUrl ?? null,
          }
        : null,
      level: course.level
        ? { id: course.level.id, name: course.level.name }
        : null,
      category: course.category
        ? { id: course.category.id, name: course.category.name }
        : null,
      language: course.language,
      totalDurationSecs: course.totalDurationSecs ?? 0,
      totalSections: course.totalSections ?? 0,
      totalLectures: course.totalLectures ?? 0,
      price: course.price,
      isFree: course.isFree,
      hasCertificate: course.hasCertificate,
      avgRating: course.avgRating ?? null,
      totalEnrollments: course.totalEnrollments ?? 0,
      learningOutcomes: learningOutcomes.map((item) => item.description),
      requirements: requirements.map((item) => item.description),
      targetLearners: targetLearners.map((item) => item.description),
      groupIds: groupAssignments.map((assignment) => assignment.group.id),
      curriculum,
      isEnrolled: !!enrollment,
      enrollmentStatus: enrollment?.status ?? null,
      enrollmentId: enrollment?.id ?? null,
    };
  }

  /**
   * Resolves a slug to a course a student is allowed to see. Draft,
   * unpublished and inactive courses are reported as 404 rather than 403 so
   * the catalog does not confirm that an unpublished slug exists.
   */
  private async findVisibleCourse(slug: string): Promise<Course> {
    const course = await this.coursesService.findBySlug(slug);

    if (!course || course.status !== 'published') {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'courseNotFound',
      });
    }

    return course;
  }
}
