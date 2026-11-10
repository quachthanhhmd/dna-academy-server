import { Lecture } from '../lectures/domain/lecture';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import { LecturesService } from '../lectures/lectures.service';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureRatingResponseDto } from './dto/create-lecture-rating-response.dto';
import { UpdateLectureRatingResponseDto } from './dto/update-lecture-rating-response.dto';
import {
  LectureRatingResponseRepository,
  LectureRatingUpsert,
} from './infrastructure/persistence/lecture-rating-response.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureRatingResponse } from './domain/lecture-rating-response';

@Injectable()
export class LectureRatingResponsesService {
  constructor(
    private readonly enrollmentService: EnrollmentsService,

    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureRatingResponseRepository: LectureRatingResponseRepository,
  ) {}

  async create(createLectureRatingResponseDto: CreateLectureRatingResponseDto) {
    // Do not remove comment below.
    // <creating-property />
    const enrollmentObject = await this.enrollmentService.findById(
      createLectureRatingResponseDto.enrollment.id,
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

    const lectureObject = await this.lectureService.findById(
      createLectureRatingResponseDto.lecture.id,
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

    return this.lectureRatingResponseRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      enrollment,

      lecture,

      submittedAt: createLectureRatingResponseDto.submittedAt,

      comment: createLectureRatingResponseDto.comment,

      rating: createLectureRatingResponseDto.rating,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureRatingResponseRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureRatingResponse['id']) {
    return this.lectureRatingResponseRepository.findById(id);
  }

  findByIds(ids: LectureRatingResponse['id'][]) {
    return this.lectureRatingResponseRepository.findByIds(ids);
  }

  async update(
    id: LectureRatingResponse['id'],

    updateLectureRatingResponseDto: UpdateLectureRatingResponseDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let enrollment: Enrollment | undefined = undefined;

    if (updateLectureRatingResponseDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateLectureRatingResponseDto.enrollment.id,
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

    let lecture: Lecture | undefined = undefined;

    if (updateLectureRatingResponseDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureRatingResponseDto.lecture.id,
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

    return this.lectureRatingResponseRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      enrollment,

      lecture,

      submittedAt: updateLectureRatingResponseDto.submittedAt,

      comment: updateLectureRatingResponseDto.comment,

      rating: updateLectureRatingResponseDto.rating,
    });
  }

  remove(id: LectureRatingResponse['id']) {
    return this.lectureRatingResponseRepository.remove(id);
  }

  findOne(lectureId: string, enrollmentId: string) {
    return this.lectureRatingResponseRepository.findOne(
      lectureId,
      enrollmentId,
    );
  }

  upsert(data: LectureRatingUpsert) {
    return this.lectureRatingResponseRepository.upsert(data);
  }

  summarize(lectureId: string, commentLimit: number) {
    return this.lectureRatingResponseRepository.summarize(
      lectureId,
      commentLimit,
    );
  }

  removeByEnrollmentId(enrollmentId: string) {
    return this.lectureRatingResponseRepository.removeByEnrollmentId(
      enrollmentId,
    );
  }
}
