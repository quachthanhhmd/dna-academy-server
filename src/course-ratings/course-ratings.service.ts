import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCourseRatingDto } from './dto/create-course-rating.dto';
import { UpdateCourseRatingDto } from './dto/update-course-rating.dto';
import { CourseRatingRepository } from './infrastructure/persistence/course-rating.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CourseRating } from './domain/course-rating';

@Injectable()
export class CourseRatingsService {
  constructor(
    private readonly courseService: CoursesService,

    private readonly userService: UsersService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly courseRatingRepository: CourseRatingRepository,
  ) {}

  async create(createCourseRatingDto: CreateCourseRatingDto) {
    // Do not remove comment below.
    // <creating-property />

    const courseObject = await this.courseService.findById(
      createCourseRatingDto.course.id,
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

    const studentObject = await this.userService.findById(
      createCourseRatingDto.student.id,
    );
    if (!studentObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          student: 'notExists',
        },
      });
    }
    const student = studentObject;

    const enrollmentObject = await this.enrollmentService.findById(
      createCourseRatingDto.enrollment.id,
    );
    if (!enrollmentObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          enrollment: 'notExists',
        },
      });
    }
    const enrollment = enrollmentObject;

    return this.courseRatingRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      submittedAt: createCourseRatingDto.submittedAt,

      reviewStatus: createCourseRatingDto.reviewStatus,

      reviewText: createCourseRatingDto.reviewText,

      rating: createCourseRatingDto.rating,

      course,

      student,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseRatingRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CourseRating['id']) {
    return this.courseRatingRepository.findById(id);
  }

  findByIds(ids: CourseRating['id'][]) {
    return this.courseRatingRepository.findByIds(ids);
  }

  async update(
    id: CourseRating['id'],

    updateCourseRatingDto: UpdateCourseRatingDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let course: Course | undefined = undefined;

    if (updateCourseRatingDto.course) {
      const courseObject = await this.courseService.findById(
        updateCourseRatingDto.course.id,
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

    let student: User | undefined = undefined;

    if (updateCourseRatingDto.student) {
      const studentObject = await this.userService.findById(
        updateCourseRatingDto.student.id,
      );
      if (!studentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            student: 'notExists',
          },
        });
      }
      student = studentObject;
    }

    let enrollment: Enrollment | undefined = undefined;

    if (updateCourseRatingDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateCourseRatingDto.enrollment.id,
      );
      if (!enrollmentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            enrollment: 'notExists',
          },
        });
      }
      enrollment = enrollmentObject;
    }

    return this.courseRatingRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      submittedAt: updateCourseRatingDto.submittedAt,

      reviewStatus: updateCourseRatingDto.reviewStatus,

      reviewText: updateCourseRatingDto.reviewText,

      rating: updateCourseRatingDto.rating,

      course,

      student,

      enrollment,
    });
  }

  remove(id: CourseRating['id']) {
    return this.courseRatingRepository.remove(id);
  }
}
