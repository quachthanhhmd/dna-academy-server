import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCourseTargetLearnerDto } from './dto/create-course-target-learner.dto';
import { UpdateCourseTargetLearnerDto } from './dto/update-course-target-learner.dto';
import { CourseTargetLearnerRepository } from './infrastructure/persistence/course-target-learner.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CourseTargetLearner } from './domain/course-target-learner';

@Injectable()
export class CourseTargetLearnersService {
  constructor(
    private readonly courseService: CoursesService,

    // Dependencies here
    private readonly courseTargetLearnerRepository: CourseTargetLearnerRepository,
  ) {}

  async create(createCourseTargetLearnerDto: CreateCourseTargetLearnerDto) {
    // Do not remove comment below.
    // <creating-property />

    const courseObject = await this.courseService.findById(
      createCourseTargetLearnerDto.course.id,
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

    return this.courseTargetLearnerRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createCourseTargetLearnerDto.displayOrder,

      description: createCourseTargetLearnerDto.description,

      course,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseTargetLearnerRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CourseTargetLearner['id']) {
    return this.courseTargetLearnerRepository.findById(id);
  }

  findByIds(ids: CourseTargetLearner['id'][]) {
    return this.courseTargetLearnerRepository.findByIds(ids);
  }

  async update(
    id: CourseTargetLearner['id'],

    updateCourseTargetLearnerDto: UpdateCourseTargetLearnerDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let course: Course | undefined = undefined;

    if (updateCourseTargetLearnerDto.course) {
      const courseObject = await this.courseService.findById(
        updateCourseTargetLearnerDto.course.id,
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

    return this.courseTargetLearnerRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateCourseTargetLearnerDto.displayOrder,

      description: updateCourseTargetLearnerDto.description,

      course,
    });
  }

  remove(id: CourseTargetLearner['id']) {
    return this.courseTargetLearnerRepository.remove(id);
  }
}
