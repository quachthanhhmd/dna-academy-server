import { Lecture } from '../lectures/domain/lecture';
import { LecturesService } from '../lectures/lectures.service';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureContentRatingDto } from './dto/create-lecture-content-rating.dto';
import { UpdateLectureContentRatingDto } from './dto/update-lecture-content-rating.dto';
import { LectureContentRatingRepository } from './infrastructure/persistence/lecture-content-rating.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureContentRating } from './domain/lecture-content-rating';

@Injectable()
export class LectureContentRatingsService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentRatingRepository: LectureContentRatingRepository,
  ) {}

  async create(createLectureContentRatingDto: CreateLectureContentRatingDto) {
    // Do not remove comment below.
    // <creating-property />
    const lectureObject = await this.lectureService.findById(
      createLectureContentRatingDto.lecture.id,
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

    return this.lectureContentRatingRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      lecture,

      allowComment: createLectureContentRatingDto.allowComment,

      labelMax: createLectureContentRatingDto.labelMax,

      labelMin: createLectureContentRatingDto.labelMin,

      prompt: createLectureContentRatingDto.prompt,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureContentRatingRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureContentRating['id']) {
    return this.lectureContentRatingRepository.findById(id);
  }

  findByIds(ids: LectureContentRating['id'][]) {
    return this.lectureContentRatingRepository.findByIds(ids);
  }

  async update(
    id: LectureContentRating['id'],

    updateLectureContentRatingDto: UpdateLectureContentRatingDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let lecture: Lecture | undefined = undefined;

    if (updateLectureContentRatingDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureContentRatingDto.lecture.id,
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

    return this.lectureContentRatingRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      lecture,

      allowComment: updateLectureContentRatingDto.allowComment,

      labelMax: updateLectureContentRatingDto.labelMax,

      labelMin: updateLectureContentRatingDto.labelMin,

      prompt: updateLectureContentRatingDto.prompt,
    });
  }

  remove(id: LectureContentRating['id']) {
    return this.lectureContentRatingRepository.remove(id);
  }

  findByLectureId(lectureId: string) {
    return this.lectureContentRatingRepository.findByLectureId(lectureId);
  }
}
