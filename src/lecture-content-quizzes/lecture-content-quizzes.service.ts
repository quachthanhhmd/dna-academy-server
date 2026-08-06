import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureContentQuizDto } from './dto/create-lecture-content-quiz.dto';
import { UpdateLectureContentQuizDto } from './dto/update-lecture-content-quiz.dto';
import { LectureContentQuizRepository } from './infrastructure/persistence/lecture-content-quiz.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureContentQuiz } from './domain/lecture-content-quiz';

@Injectable()
export class LectureContentQuizzesService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentQuizRepository: LectureContentQuizRepository,
  ) {}

  async create(createLectureContentQuizDto: CreateLectureContentQuizDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createLectureContentQuizDto.lecture.id,
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

    return this.lectureContentQuizRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      allowResume: createLectureContentQuizDto.allowResume,

      passingScore: createLectureContentQuizDto.passingScore,

      instructions: createLectureContentQuizDto.instructions,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureContentQuizRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureContentQuiz['id']) {
    return this.lectureContentQuizRepository.findById(id);
  }

  findByIds(ids: LectureContentQuiz['id'][]) {
    return this.lectureContentQuizRepository.findByIds(ids);
  }

  async update(
    id: LectureContentQuiz['id'],

    updateLectureContentQuizDto: UpdateLectureContentQuizDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateLectureContentQuizDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureContentQuizDto.lecture.id,
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

    return this.lectureContentQuizRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      allowResume: updateLectureContentQuizDto.allowResume,

      passingScore: updateLectureContentQuizDto.passingScore,

      instructions: updateLectureContentQuizDto.instructions,

      lecture,
    });
  }

  remove(id: LectureContentQuiz['id']) {
    return this.lectureContentQuizRepository.remove(id);
  }
}
