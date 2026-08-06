import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureProgressDto } from './dto/create-lecture-progress.dto';
import { UpdateLectureProgressDto } from './dto/update-lecture-progress.dto';
import { LectureProgressRepository } from './infrastructure/persistence/lecture-progress.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureProgress } from './domain/lecture-progress';

@Injectable()
export class LectureProgressesService {
  constructor(
    private readonly lectureService: LecturesService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly lectureProgressRepository: LectureProgressRepository,
  ) {}

  async create(createLectureProgressDto: CreateLectureProgressDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createLectureProgressDto.lecture.id,
    );
    if (!lectureObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          lecture: 'notExists',
        },
      });
    }
    const lecture = lectureObject;

    const enrollmentObject = await this.enrollmentService.findById(
      createLectureProgressDto.enrollment.id,
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

    return this.lectureProgressRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      watchDurationSecs: createLectureProgressDto.watchDurationSecs,

      completedAt: createLectureProgressDto.completedAt,

      startedAt: createLectureProgressDto.startedAt,

      status: createLectureProgressDto.status,

      lecture,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureProgressRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureProgress['id']) {
    return this.lectureProgressRepository.findById(id);
  }

  findByIds(ids: LectureProgress['id'][]) {
    return this.lectureProgressRepository.findByIds(ids);
  }

  async update(
    id: LectureProgress['id'],

    updateLectureProgressDto: UpdateLectureProgressDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateLectureProgressDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureProgressDto.lecture.id,
      );
      if (!lectureObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            lecture: 'notExists',
          },
        });
      }
      lecture = lectureObject;
    }

    let enrollment: Enrollment | undefined = undefined;

    if (updateLectureProgressDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateLectureProgressDto.enrollment.id,
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

    return this.lectureProgressRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      watchDurationSecs: updateLectureProgressDto.watchDurationSecs,

      completedAt: updateLectureProgressDto.completedAt,

      startedAt: updateLectureProgressDto.startedAt,

      status: updateLectureProgressDto.status,

      lecture,

      enrollment,
    });
  }

  remove(id: LectureProgress['id']) {
    return this.lectureProgressRepository.remove(id);
  }
}
