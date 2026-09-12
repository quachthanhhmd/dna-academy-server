import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';

import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCourseGroupAssignmentDto } from './dto/create-course-group-assignment.dto';
import { UpdateCourseGroupAssignmentDto } from './dto/update-course-group-assignment.dto';
import { CourseGroupAssignmentRepository } from './infrastructure/persistence/course-group-assignment.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CourseGroupAssignment } from './domain/course-group-assignment';

@Injectable()
export class CourseGroupAssignmentsService {
  constructor(
    private readonly masterDataCodeService: MasterDataCodesService,

    private readonly courseService: CoursesService,

    // Dependencies here
    private readonly courseGroupAssignmentRepository: CourseGroupAssignmentRepository,
  ) {}

  async create(createCourseGroupAssignmentDto: CreateCourseGroupAssignmentDto) {
    // Do not remove comment below.
    // <creating-property />
    const groupObject = await this.masterDataCodeService.findById(
      createCourseGroupAssignmentDto.group.id,
    );
    if (!groupObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          group: 'notExists',
        },
      });
    }
    const group = groupObject;

    const courseObject = await this.courseService.findById(
      createCourseGroupAssignmentDto.course.id,
    );
    if (!courseObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          course: 'notExists',
        },
      });
    }
    const course = courseObject;

    return this.courseGroupAssignmentRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      group,

      course,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseGroupAssignmentRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CourseGroupAssignment['id']) {
    return this.courseGroupAssignmentRepository.findById(id);
  }

  findByIds(ids: CourseGroupAssignment['id'][]) {
    return this.courseGroupAssignmentRepository.findByIds(ids);
  }

  countByGroupId(groupId: string) {
    return this.courseGroupAssignmentRepository.countByGroupId(groupId);
  }

  findByCourseId(courseId: string) {
    return this.courseGroupAssignmentRepository.findByCourseId(courseId);
  }

  /** Epic 4.4 §1.3 — one query for a whole catalog page's `groupIds`. */
  findGroupIdsByCourseIds(courseIds: string[]) {
    return this.courseGroupAssignmentRepository.findGroupIdsByCourseIds(
      courseIds,
    );
  }

  /** Epic 4.5 §1.3 — the single group shown on a My Learning card. */
  findPrimaryGroupByCourseIds(courseIds: string[]) {
    return this.courseGroupAssignmentRepository.findPrimaryGroupByCourseIds(
      courseIds,
    );
  }

  removeByCourseId(courseId: string) {
    return this.courseGroupAssignmentRepository.removeByCourseId(courseId);
  }

  async update(
    id: CourseGroupAssignment['id'],

    updateCourseGroupAssignmentDto: UpdateCourseGroupAssignmentDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let group: MasterDataCode | undefined = undefined;

    if (updateCourseGroupAssignmentDto.group) {
      const groupObject = await this.masterDataCodeService.findById(
        updateCourseGroupAssignmentDto.group.id,
      );
      if (!groupObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            group: 'notExists',
          },
        });
      }
      group = groupObject;
    }

    let course: Course | undefined = undefined;

    if (updateCourseGroupAssignmentDto.course) {
      const courseObject = await this.courseService.findById(
        updateCourseGroupAssignmentDto.course.id,
      );
      if (!courseObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            course: 'notExists',
          },
        });
      }
      course = courseObject;
    }

    return this.courseGroupAssignmentRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      group,

      course,
    });
  }

  remove(id: CourseGroupAssignment['id']) {
    return this.courseGroupAssignmentRepository.remove(id);
  }
}
