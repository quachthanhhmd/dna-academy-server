import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCourseRequirementDto } from './dto/create-course-requirement.dto';
import { UpdateCourseRequirementDto } from './dto/update-course-requirement.dto';
import { CourseRequirementRepository } from './infrastructure/persistence/course-requirement.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CourseRequirement } from './domain/course-requirement';

@Injectable()
export class CourseRequirementsService {
  constructor(
    private readonly courseService: CoursesService,

    // Dependencies here
    private readonly courseRequirementRepository: CourseRequirementRepository,
  ) {}

  async create(createCourseRequirementDto: CreateCourseRequirementDto) {
    // Do not remove comment below.
    // <creating-property />

    const courseObject = await this.courseService.findById(
      createCourseRequirementDto.course.id,
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

    return this.courseRequirementRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createCourseRequirementDto.displayOrder,

      description: createCourseRequirementDto.description,

      course,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.courseRequirementRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CourseRequirement['id']) {
    return this.courseRequirementRepository.findById(id);
  }

  findByIds(ids: CourseRequirement['id'][]) {
    return this.courseRequirementRepository.findByIds(ids);
  }

  async update(
    id: CourseRequirement['id'],

    updateCourseRequirementDto: UpdateCourseRequirementDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let course: Course | undefined = undefined;

    if (updateCourseRequirementDto.course) {
      const courseObject = await this.courseService.findById(
        updateCourseRequirementDto.course.id,
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

    return this.courseRequirementRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateCourseRequirementDto.displayOrder,

      description: updateCourseRequirementDto.description,

      course,
    });
  }

  remove(id: CourseRequirement['id']) {
    return this.courseRequirementRepository.remove(id);
  }
}
