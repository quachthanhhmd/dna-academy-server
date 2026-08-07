import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionRepository } from './infrastructure/persistence/section.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';
import { Section } from './domain/section';

@Injectable()
export class SectionsService {
  constructor(
    private readonly courseService: CoursesService,

    // Dependencies here
    private readonly sectionRepository: SectionRepository,
  ) {}

  async create(createSectionDto: CreateSectionDto) {
    // Do not remove comment below.
    // <creating-property />

    const courseObject = await this.courseService.findById(
      createSectionDto.course.id,
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

    return this.sectionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createSectionDto.displayOrder,

      learningObjective: createSectionDto.learningObjective,

      description: createSectionDto.description,

      title: createSectionDto.title,

      course,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.sectionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Section['id']) {
    return this.sectionRepository.findById(id);
  }

  findByIds(ids: Section['id'][]) {
    return this.sectionRepository.findByIds(ids);
  }

  findByCourseId(courseId: string) {
    return this.sectionRepository.findByCourseId(courseId);
  }

  countByCourseId(courseId: string) {
    return this.sectionRepository.countByCourseId(courseId);
  }

  async update(
    id: Section['id'],

    updateSectionDto: UpdateSectionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let course: Course | undefined = undefined;

    if (updateSectionDto.course) {
      const courseObject = await this.courseService.findById(
        updateSectionDto.course.id,
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

    const payload: DeepPartial<Section> = {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateSectionDto.displayOrder,

      learningObjective: updateSectionDto.learningObjective,

      description: updateSectionDto.description,

      title: updateSectionDto.title,

      course,
    };

    // See CoursesService.update for why this is necessary: a partial update
    // DTO instance carries every declared field as an own property, so an
    // undefined value here would otherwise clobber the existing column via
    // the repository's `{ ...current, ...payload }` merge.
    for (const key of Object.keys(payload) as (keyof Section)[]) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    return this.sectionRepository.update(id, payload);
  }

  remove(id: Section['id']) {
    return this.sectionRepository.remove(id);
  }
}
