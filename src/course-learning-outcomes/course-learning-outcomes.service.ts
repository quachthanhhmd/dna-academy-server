import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCourseLearningOutcomeDto } from './dto/create-course-learning-outcome.dto';
import { UpdateCourseLearningOutcomeDto } from './dto/update-course-learning-outcome.dto';
import { CourseLearningOutcomeRepository } from './infrastructure/persistence/course-learning-outcome.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CourseLearningOutcome } from './domain/course-learning-outcome';

@Injectable()
export class CourseLearningOutcomesService {
  constructor(
    private readonly courseService: CoursesService,

    // Dependencies here
    private readonly courseLearningOutcomeRepository: CourseLearningOutcomeRepository,
  ) {}

  async create(createCourseLearningOutcomeDto: CreateCourseLearningOutcomeDto) {
    // Do not remove comment below.
    // <creating-property />

    const courseObject = await this.courseService.findById(
      createCourseLearningOutcomeDto.course.id,
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

    return this.courseLearningOutcomeRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createCourseLearningOutcomeDto.displayOrder,

      description: createCourseLearningOutcomeDto.description,

      course,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseLearningOutcomeRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CourseLearningOutcome['id']) {
    return this.courseLearningOutcomeRepository.findById(id);
  }

  findByIds(ids: CourseLearningOutcome['id'][]) {
    return this.courseLearningOutcomeRepository.findByIds(ids);
  }

  async update(
    id: CourseLearningOutcome['id'],

    updateCourseLearningOutcomeDto: UpdateCourseLearningOutcomeDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let course: Course | undefined = undefined;

    if (updateCourseLearningOutcomeDto.course) {
      const courseObject = await this.courseService.findById(
        updateCourseLearningOutcomeDto.course.id,
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

    return this.courseLearningOutcomeRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateCourseLearningOutcomeDto.displayOrder,

      description: updateCourseLearningOutcomeDto.description,

      course,
    });
  }

  remove(id: CourseLearningOutcome['id']) {
    return this.courseLearningOutcomeRepository.remove(id);
  }
}
