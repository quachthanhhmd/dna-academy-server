import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureContentArticleDto } from './dto/create-lecture-content-article.dto';
import { UpdateLectureContentArticleDto } from './dto/update-lecture-content-article.dto';
import { LectureContentArticleRepository } from './infrastructure/persistence/lecture-content-article.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureContentArticle } from './domain/lecture-content-article';

@Injectable()
export class LectureContentArticlesService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentArticleRepository: LectureContentArticleRepository,
  ) {}

  async create(createLectureContentArticleDto: CreateLectureContentArticleDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createLectureContentArticleDto.lecture.id,
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

    return this.lectureContentArticleRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      body: createLectureContentArticleDto.body,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureContentArticleRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureContentArticle['id']) {
    return this.lectureContentArticleRepository.findById(id);
  }

  findByIds(ids: LectureContentArticle['id'][]) {
    return this.lectureContentArticleRepository.findByIds(ids);
  }

  async update(
    id: LectureContentArticle['id'],

    updateLectureContentArticleDto: UpdateLectureContentArticleDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateLectureContentArticleDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureContentArticleDto.lecture.id,
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

    return this.lectureContentArticleRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      body: updateLectureContentArticleDto.body,

      lecture,
    });
  }

  remove(id: LectureContentArticle['id']) {
    return this.lectureContentArticleRepository.remove(id);
  }
}
