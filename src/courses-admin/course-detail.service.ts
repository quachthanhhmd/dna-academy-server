import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { SectionsService } from '../sections/sections.service';
import { LecturesService } from '../lectures/lectures.service';
import { CourseLearningOutcomesService } from '../course-learning-outcomes/course-learning-outcomes.service';
import { CourseRequirementsService } from '../course-requirements/course-requirements.service';
import { CourseTargetLearnersService } from '../course-target-learners/course-target-learners.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { CourseInstructorsService } from '../course-instructors/course-instructors.service';

@Injectable()
export class CourseDetailService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
    private readonly courseLearningOutcomesService: CourseLearningOutcomesService,
    private readonly courseRequirementsService: CourseRequirementsService,
    private readonly courseTargetLearnersService: CourseTargetLearnersService,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
    private readonly courseInstructorsService: CourseInstructorsService,
  ) {}

  async findDetail(courseId: Course['id']) {
    const course = await this.coursesService.findById(courseId);

    if (!course) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'courseNotFound',
      });
    }

    const [
      sections,
      learningOutcomes,
      requirements,
      targetLearners,
      groupAssignments,
      instructors,
    ] = await Promise.all([
      this.sectionsService.findByCourseId(courseId),
      this.courseLearningOutcomesService.findByCourseId(courseId),
      this.courseRequirementsService.findByCourseId(courseId),
      this.courseTargetLearnersService.findByCourseId(courseId),
      this.courseGroupAssignmentsService.findByCourseId(courseId),
      this.courseInstructorsService.findViewByCourseId(courseId),
    ]);

    // One query for the whole course, not one per lecture: the curriculum
    // screen labels every row "has content / no content", and before this it
    // only knew about lectures saved in the current session — so after a
    // reload every lecture claimed to be empty.
    const withContent =
      await this.lecturesService.findIdsWithContentByCourseId(courseId);

    const sectionsWithLectures = await Promise.all(
      sections.map(async (section) => ({
        ...section,
        lectures: (await this.lecturesService.findBySectionId(section.id)).map(
          (lecture) => ({
            ...lecture,
            hasContent: withContent.has(lecture.id),
          }),
        ),
      })),
    );

    return {
      ...course,
      sections: sectionsWithLectures,
      learningOutcomes,
      requirements,
      targetLearners,
      groupIds: groupAssignments.map((assignment) => assignment.group.id),
      primaryInstructor: instructors.primaryInstructor,
      coInstructors: instructors.coInstructors,
    };
  }
}
