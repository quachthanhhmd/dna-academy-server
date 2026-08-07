import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureContentReflectionDto } from './dto/create-lecture-content-reflection.dto';
import { UpdateLectureContentReflectionDto } from './dto/update-lecture-content-reflection.dto';
import { LectureContentReflectionRepository } from './infrastructure/persistence/lecture-content-reflection.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureContentReflection } from './domain/lecture-content-reflection';

@Injectable()
export class LectureContentReflectionsService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentReflectionRepository: LectureContentReflectionRepository,
  ) {}

  async create(
    createLectureContentReflectionDto: CreateLectureContentReflectionDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createLectureContentReflectionDto.lecture.id,
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

    return this.lectureContentReflectionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      minResponseLength: createLectureContentReflectionDto.minResponseLength,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureContentReflectionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureContentReflection['id']) {
    return this.lectureContentReflectionRepository.findById(id);
  }

  findByIds(ids: LectureContentReflection['id'][]) {
    return this.lectureContentReflectionRepository.findByIds(ids);
  }

  findByLectureId(lectureId: string) {
    return this.lectureContentReflectionRepository.findByLectureId(lectureId);
  }

  async update(
    id: LectureContentReflection['id'],

    updateLectureContentReflectionDto: UpdateLectureContentReflectionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateLectureContentReflectionDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureContentReflectionDto.lecture.id,
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

    return this.lectureContentReflectionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      minResponseLength: updateLectureContentReflectionDto.minResponseLength,

      lecture,
    });
  }

  remove(id: LectureContentReflection['id']) {
    return this.lectureContentReflectionRepository.remove(id);
  }
}
