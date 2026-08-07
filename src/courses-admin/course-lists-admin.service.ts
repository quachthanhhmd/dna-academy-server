import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { CourseLearningOutcomesService } from '../course-learning-outcomes/course-learning-outcomes.service';
import { CourseRequirementsService } from '../course-requirements/course-requirements.service';
import { CourseTargetLearnersService } from '../course-target-learners/course-target-learners.service';
import { CourseListItemDto } from './dto/replace-course-list.dto';

interface CourseListSubResourceService<T> {
  removeByCourseId(courseId: string): Promise<void>;
  create(data: {
    course: { id: string };
    description: string;
    displayOrder: number;
  }): Promise<T>;
}

@Injectable()
export class CourseListsAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseLearningOutcomesService: CourseLearningOutcomesService,
    private readonly courseRequirementsService: CourseRequirementsService,
    private readonly courseTargetLearnersService: CourseTargetLearnersService,
  ) {}

  async replaceOutcomes(courseId: Course['id'], items: CourseListItemDto[]) {
    await this.findCourseOrThrow(courseId);
    return this.replaceList(
      courseId,
      items,
      this.courseLearningOutcomesService,
    );
  }

  async replaceRequirements(
    courseId: Course['id'],
    items: CourseListItemDto[],
  ) {
    await this.findCourseOrThrow(courseId);
    return this.replaceList(courseId, items, this.courseRequirementsService);
  }

  async replaceTargetLearners(
    courseId: Course['id'],
    items: CourseListItemDto[],
  ) {
    await this.findCourseOrThrow(courseId);
    return this.replaceList(courseId, items, this.courseTargetLearnersService);
  }

  private async replaceList<T>(
    courseId: Course['id'],
    items: CourseListItemDto[],
    service: CourseListSubResourceService<T>,
  ): Promise<T[]> {
    await service.removeByCourseId(courseId);

    const created: T[] = [];
    for (const item of items) {
      created.push(
        await service.create({
          course: { id: courseId },
          description: item.description,
          displayOrder: item.displayOrder,
        }),
      );
    }

    return created;
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
