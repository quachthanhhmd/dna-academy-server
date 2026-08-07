import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { CourseGroupAssignment } from '../course-group-assignments/domain/course-group-assignment';

const COURSE_GROUP_KEY = 'course_group';

@Injectable()
export class CourseGroupsAdminService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly masterDataCodesService: MasterDataCodesService,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
  ) {}

  async replaceGroups(
    courseId: Course['id'],
    groupIds: string[],
  ): Promise<CourseGroupAssignment[]> {
    await this.findCourseOrThrow(courseId);

    const groups = await Promise.all(
      groupIds.map((groupId) => this.resolveGroupCode(groupId)),
    );

    await this.courseGroupAssignmentsService.removeByCourseId(courseId);

    const created: CourseGroupAssignment[] = [];
    for (const group of groups) {
      created.push(
        await this.courseGroupAssignmentsService.create({
          course: { id: courseId },
          group,
        }),
      );
    }

    return created;
  }

  private async resolveGroupCode(groupId: string) {
    const code = await this.masterDataCodesService.findById(groupId);

    if (!code || !code.isActive || code.group.groupKey !== COURSE_GROUP_KEY) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { groupIds: `notExists:${groupId}` },
      });
    }

    return code;
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
