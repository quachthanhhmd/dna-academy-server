import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { UpdateSurveyResponseDto } from './dto/update-survey-response.dto';
import { SurveyResponseRepository } from './infrastructure/persistence/survey-response.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { SurveyResponse } from './domain/survey-response';

@Injectable()
export class SurveyResponsesService {
  constructor(
    private readonly enrollmentService: EnrollmentsService,

    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly surveyResponseRepository: SurveyResponseRepository,
  ) {}

  async create(createSurveyResponseDto: CreateSurveyResponseDto) {
    // Do not remove comment below.
    // <creating-property />
    const enrollmentObject = await this.enrollmentService.findById(
      createSurveyResponseDto.enrollment.id,
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
      createSurveyResponseDto.lecture.id,
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

    return this.surveyResponseRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      enrollment,

      lecture,

      submittedAt: createSurveyResponseDto.submittedAt,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.surveyResponseRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: SurveyResponse['id']) {
    return this.surveyResponseRepository.findById(id);
  }

  findByIds(ids: SurveyResponse['id'][]) {
    return this.surveyResponseRepository.findByIds(ids);
  }

  async update(
    id: SurveyResponse['id'],

    updateSurveyResponseDto: UpdateSurveyResponseDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let enrollment: Enrollment | undefined = undefined;

    if (updateSurveyResponseDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateSurveyResponseDto.enrollment.id,
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

    if (updateSurveyResponseDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateSurveyResponseDto.lecture.id,
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

    return this.surveyResponseRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      enrollment,

      lecture,

      submittedAt: updateSurveyResponseDto.submittedAt,
    });
  }

  remove(id: SurveyResponse['id']) {
    return this.surveyResponseRepository.remove(id);
  }

  findOne(lectureId: string, enrollmentId: string) {
    return this.surveyResponseRepository.findOne(lectureId, enrollmentId);
  }

  upsert(lectureId: string, enrollmentId: string, submittedAt: Date) {
    return this.surveyResponseRepository.upsert(
      lectureId,
      enrollmentId,
      submittedAt,
    );
  }

  removeByEnrollmentId(enrollmentId: string) {
    return this.surveyResponseRepository.removeByEnrollmentId(enrollmentId);
  }
}
