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
import { CourseInstructorsService } from '../course-instructors/course-instructors.service';
import { InstructorsService } from '../instructors/instructors.service';
import { InstructorProfilesService } from '../instructors/instructor-profiles.service';
import { InstructorProfileDto } from '../instructors/dto/instructor-profile.dto';
import { LectureProgressesService } from '../lecture-progresses/lecture-progresses.service';
import { SequentialLockService } from '../learning/services/sequential-lock.service';
import { Lecture } from '../lectures/domain/lecture';
import { Enrollment } from '../enrollments/domain/enrollment';

export const LOCK_REASON_NOT_ENROLLED = 'NOT_ENROLLED';

type LectureProgressView = {
  progressStatus: string | null;
  isLocked: boolean;
  lockReason: string | null;
  requiredLectureId: string | null;
  watchDurationSecs: number | null;
};

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
    private readonly courseInstructorsService: CourseInstructorsService,
    private readonly instructorsService: InstructorsService,
    private readonly instructorProfilesService: InstructorProfilesService,
    private readonly lectureProgressesService: LectureProgressesService,
    private readonly sequentialLockService: SequentialLockService,
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
      instructorRefs,
    ] = await Promise.all([
      this.sectionsService.findByCourseId(course.id),
      this.courseLearningOutcomesService.findByCourseId(course.id),
      this.courseRequirementsService.findByCourseId(course.id),
      this.courseTargetLearnersService.findByCourseId(course.id),
      this.courseGroupAssignmentsService.findByCourseId(course.id),
      studentId
        ? this.enrollmentsService.findByStudentAndCourse(studentId, course.id)
        : Promise.resolve(null),
      this.courseInstructorsService.findViewByCourseId(course.id),
    ]);

    const { primaryInstructor, coInstructors } =
      await this.loadInstructorProfiles(instructorRefs);

    const orderedSections = [...sections].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );

    const sectionLectures = await Promise.all(
      orderedSections.map(async (section) => ({
        section,
        lectures: [
          ...(await this.lecturesService.findBySectionId(section.id)),
        ].sort((a, b) => a.displayOrder - b.displayOrder),
      })),
    );

    // Locks are a property of the course's whole reading order, so they have
    // to be evaluated against the flattened list — a lecture can be blocked by
    // one in an earlier section.
    const orderedLectures = sectionLectures.flatMap((entry) => entry.lectures);
    const progressView = await this.lectureProgressView(
      course.requiresSequentialCompletion ?? false,
      orderedLectures,
      enrollment,
    );

    const curriculum = sectionLectures.map(({ section, lectures }) => ({
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
        ...progressView(lecture),
      })),
    }));

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription ?? null,
      fullDescription: course.fullDescription ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      introVideoUrl: course.introVideoUrl ?? null,
      primaryInstructor,
      coInstructors,
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
      requiresSequentialCompletion:
        course.requiresSequentialCompletion ?? false,
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
   * Epic 4 v2.2 — per-lecture progress and lock state for the overview
   * sidebar, so a reload does not lose the student's tick marks.
   *
   * Progress is read once for the whole enrollment and indexed in memory
   * rather than queried per lecture (§2.2: the join must be batched). A guest
   * costs no query at all.
   */
  private async lectureProgressView(
    requiresSequentialCompletion: boolean,
    orderedLectures: Lecture[],
    enrollment: Enrollment | null,
  ): Promise<(lecture: Lecture) => LectureProgressView> {
    const isEnrolled = !!enrollment && enrollment.status !== 'cancelled';

    if (!isEnrolled) {
      // Epic 4.3 BE-1 — a visitor has no progress to report, and the lock is
      // purely structural: a free preview is open, everything else is not.
      //
      // This used to read `requiresSequentialCompletion && !isPreview`, which
      // told a guest on a non-sequential course that every lecture was open.
      // Sequential completion orders lectures *within* a course; it has
      // nothing to say about someone who has not enrolled. The two conditions
      // were conflated because on the only courses anyone tested, both
      // happened to be true.
      return (lecture) => {
        const isLocked = !lecture.isPreview;

        return {
          progressStatus: null,
          isLocked,
          lockReason: isLocked ? LOCK_REASON_NOT_ENROLLED : null,
          // No predecessor to name: the lock is "not enrolled", not "finish
          // that one first".
          requiredLectureId: null,
          watchDurationSecs: null,
        };
      };
    }

    const rows = await this.lectureProgressesService.findByEnrollmentId(
      enrollment!.id,
    );
    const byLecture = new Map(rows.map((row) => [row.lecture.id, row]));
    const statusByLecture = new Map(
      rows.map((row) => [row.lecture.id, row.status]),
    );
    const lockable = orderedLectures.map((lecture) => ({
      id: lecture.id,
      requiresCompletion: lecture.requiresCompletion,
    }));

    return (lecture) => {
      const row = byLecture.get(lecture.id);
      const lock = this.sequentialLockService.evaluate(
        requiresSequentialCompletion,
        lockable,
        lecture.id,
        statusByLecture,
      );

      return {
        progressStatus: row?.status ?? 'not_started',
        isLocked: lock.isLocked,
        lockReason: lock.lockReason,
        // Epic 4.3 BE-2 — `evaluate` has always computed this; it was simply
        // dropped here. Without it the overview can say "locked" but not what
        // to finish first, so the tooltip would have to refetch the curriculum
        // to find out.
        requiredLectureId: lock.requiredLectureId,
        watchDurationSecs: row?.watchDurationSecs ?? 0,
      };
    };
  }

  /**
   * Turns the compact join-table refs into full public profiles. Expertise
   * and social links are fetched once for the whole course rather than per
   * instructor.
   */
  private async loadInstructorProfiles(refs: {
    primaryInstructor: { id: string } | null;
    coInstructors: { id: string }[];
  }): Promise<{
    primaryInstructor: InstructorProfileDto | null;
    coInstructors: InstructorProfileDto[];
  }> {
    const orderedIds = [
      ...(refs.primaryInstructor ? [refs.primaryInstructor.id] : []),
      ...refs.coInstructors.map((item) => item.id),
    ];

    if (!orderedIds.length) {
      return { primaryInstructor: null, coInstructors: [] };
    }

    const instructors = await this.instructorsService.findByIds(orderedIds);
    const profiles =
      await this.instructorProfilesService.toProfiles(instructors);

    return {
      primaryInstructor: refs.primaryInstructor
        ? (profiles.get(refs.primaryInstructor.id) ?? null)
        : null,
      coInstructors: refs.coInstructors
        .map((item) => profiles.get(item.id))
        .filter((profile): profile is InstructorProfileDto => !!profile),
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
