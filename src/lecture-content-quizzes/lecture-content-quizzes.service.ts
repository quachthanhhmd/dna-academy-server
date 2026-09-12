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
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class LectureContentQuizzesService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentQuizRepository: LectureContentQuizRepository,

    private readonly configService: ConfigService<AllConfigType>,
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

      // Epic 4 v2.1 §2.4.1 — `??` and not `||`, so an explicit 0 ("everyone
      // passes") survives instead of collapsing to the env default.
      passThresholdPercent:
        createLectureContentQuizDto.passThresholdPercent ??
        this.configService.getOrThrow('learning.quizPassThresholdDefault', {
          infer: true,
        }),

      instructions: createLectureContentQuizDto.instructions,

      // Epic 4 v2 §2.1 — null means no countdown, which is what the player
      // needs to hide the timer entirely.
      timeLimitSecs: createLectureContentQuizDto.timeLimitSecs ?? null,

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

  findByLectureId(lectureId: string) {
    return this.lectureContentQuizRepository.findByLectureId(lectureId);
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

      passThresholdPercent: updateLectureContentQuizDto.passThresholdPercent,

      instructions: updateLectureContentQuizDto.instructions,

      timeLimitSecs: updateLectureContentQuizDto.timeLimitSecs,

      lecture,
    });
  }

  remove(id: LectureContentQuiz['id']) {
    return this.lectureContentQuizRepository.remove(id);
  }
}
