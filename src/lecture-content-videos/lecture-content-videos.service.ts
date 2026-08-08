import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureContentVideoDto } from './dto/create-lecture-content-video.dto';
import { UpdateLectureContentVideoDto } from './dto/update-lecture-content-video.dto';
import { LectureContentVideoRepository } from './infrastructure/persistence/lecture-content-video.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureContentVideo } from './domain/lecture-content-video';

@Injectable()
export class LectureContentVideosService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentVideoRepository: LectureContentVideoRepository,
  ) {}

  async create(createLectureContentVideoDto: CreateLectureContentVideoDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createLectureContentVideoDto.lecture.id,
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

    return this.lectureContentVideoRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      youtubeVideoId: createLectureContentVideoDto.youtubeVideoId,

      youtubeUrl: createLectureContentVideoDto.youtubeUrl,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureContentVideoRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureContentVideo['id']) {
    return this.lectureContentVideoRepository.findById(id);
  }

  findByIds(ids: LectureContentVideo['id'][]) {
    return this.lectureContentVideoRepository.findByIds(ids);
  }

  findByLectureId(lectureId: string) {
    return this.lectureContentVideoRepository.findByLectureId(lectureId);
  }

  async update(
    id: LectureContentVideo['id'],

    updateLectureContentVideoDto: UpdateLectureContentVideoDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateLectureContentVideoDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureContentVideoDto.lecture.id,
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

    return this.lectureContentVideoRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      youtubeVideoId: updateLectureContentVideoDto.youtubeVideoId,

      youtubeUrl: updateLectureContentVideoDto.youtubeUrl,

      lecture,
    });
  }

  remove(id: LectureContentVideo['id']) {
    return this.lectureContentVideoRepository.remove(id);
  }
}
