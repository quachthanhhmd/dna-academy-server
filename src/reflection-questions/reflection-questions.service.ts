import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateReflectionQuestionDto } from './dto/create-reflection-question.dto';
import { UpdateReflectionQuestionDto } from './dto/update-reflection-question.dto';
import { ReflectionQuestionRepository } from './infrastructure/persistence/reflection-question.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { ReflectionQuestion } from './domain/reflection-question';

@Injectable()
export class ReflectionQuestionsService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly reflectionQuestionRepository: ReflectionQuestionRepository,
  ) {}

  async create(createReflectionQuestionDto: CreateReflectionQuestionDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createReflectionQuestionDto.lecture.id,
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

    return this.reflectionQuestionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createReflectionQuestionDto.displayOrder,

      questionText: createReflectionQuestionDto.questionText,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.reflectionQuestionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: ReflectionQuestion['id']) {
    return this.reflectionQuestionRepository.findById(id);
  }

  findByIds(ids: ReflectionQuestion['id'][]) {
    return this.reflectionQuestionRepository.findByIds(ids);
  }

  findByLectureId(lectureId: string) {
    return this.reflectionQuestionRepository.findByLectureId(lectureId);
  }

  removeByLectureId(lectureId: string) {
    return this.reflectionQuestionRepository.removeByLectureId(lectureId);
  }

  async update(
    id: ReflectionQuestion['id'],

    updateReflectionQuestionDto: UpdateReflectionQuestionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateReflectionQuestionDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateReflectionQuestionDto.lecture.id,
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

    return this.reflectionQuestionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateReflectionQuestionDto.displayOrder,

      questionText: updateReflectionQuestionDto.questionText,

      lecture,
    });
  }

  remove(id: ReflectionQuestion['id']) {
    return this.reflectionQuestionRepository.remove(id);
  }
}
