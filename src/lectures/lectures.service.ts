import { SectionsService } from '../sections/sections.service';
import { Section } from '../sections/domain/section';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { LectureRepository } from './infrastructure/persistence/lecture.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';
import { Lecture } from './domain/lecture';

@Injectable()
export class LecturesService {
  constructor(
    private readonly sectionService: SectionsService,

    // Dependencies here
    private readonly lectureRepository: LectureRepository,
  ) {}

  async create(createLectureDto: CreateLectureDto) {
    // Do not remove comment below.
    // <creating-property />

    const sectionObject = await this.sectionService.findById(
      createLectureDto.section.id,
    );
    if (!sectionObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          section: 'notExists',
        },
      });
    }
    const section = sectionObject;

    return this.lectureRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      status: createLectureDto.status,

      displayOrder: createLectureDto.displayOrder,

      requiresCompletion: createLectureDto.requiresCompletion,

      isPreview: createLectureDto.isPreview,

      durationSecs: createLectureDto.durationSecs,

      lectureType: createLectureDto.lectureType,

      description: createLectureDto.description,

      title: createLectureDto.title,

      section,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Lecture['id']) {
    return this.lectureRepository.findById(id);
  }

  findByIds(ids: Lecture['id'][]) {
    return this.lectureRepository.findByIds(ids);
  }

  findBySectionId(sectionId: string) {
    return this.lectureRepository.findBySectionId(sectionId);
  }

  /** Epic 4.5 BE-1 — one join for a whole dashboard page. */
  findOrderedByCourseIds(courseIds: string[]) {
    return this.lectureRepository.findOrderedByCourseIds(courseIds);
  }

  countBySectionId(sectionId: string) {
    return this.lectureRepository.countBySectionId(sectionId);
  }

  removeBySectionId(sectionId: string) {
    return this.lectureRepository.removeBySectionId(sectionId);
  }

  /** Epic 4.4 §1.3 — one query for a whole catalog page's `hasPreview`. */
  findPreviewCourseIds(courseIds: string[]) {
    return this.lectureRepository.findPreviewCourseIds(courseIds);
  }

  getCourseAggregates(courseId: string) {
    return this.lectureRepository.getCourseAggregates(courseId);
  }

  async update(
    id: Lecture['id'],

    updateLectureDto: UpdateLectureDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let section: Section | undefined = undefined;

    if (updateLectureDto.section) {
      const sectionObject = await this.sectionService.findById(
        updateLectureDto.section.id,
      );
      if (!sectionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            section: 'notExists',
          },
        });
      }
      section = sectionObject;
    }

    const payload: DeepPartial<Lecture> = {
      // Do not remove comment below.
      // <updating-property-payload />
      status: updateLectureDto.status,

      displayOrder: updateLectureDto.displayOrder,

      requiresCompletion: updateLectureDto.requiresCompletion,

      isPreview: updateLectureDto.isPreview,

      durationSecs: updateLectureDto.durationSecs,

      lectureType: updateLectureDto.lectureType,

      description: updateLectureDto.description,

      title: updateLectureDto.title,

      section,
    };

    // See CoursesService.update for why this is necessary: a partial update
    // DTO instance carries every declared field as an own property, so an
    // undefined value here would otherwise clobber the existing column via
    // the repository's `{ ...current, ...payload }` merge.
    for (const key of Object.keys(payload) as (keyof Lecture)[]) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }

    return this.lectureRepository.update(id, payload);
  }

  remove(id: Lecture['id']) {
    return this.lectureRepository.remove(id);
  }
}
