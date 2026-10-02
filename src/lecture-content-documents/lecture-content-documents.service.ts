import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLectureContentDocumentDto } from './dto/create-lecture-content-document.dto';
import { UpdateLectureContentDocumentDto } from './dto/update-lecture-content-document.dto';
import { LectureContentDocumentRepository } from './infrastructure/persistence/lecture-content-document.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { LectureContentDocument } from './domain/lecture-content-document';
import { StorageUrlService } from '../files/storage/storage-url.service';
import { fileRefOf } from '../files/storage/storage-url';

@Injectable()
export class LectureContentDocumentsService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly lectureContentDocumentRepository: LectureContentDocumentRepository,
    private readonly storageUrl: StorageUrlService,
  ) {}

  /**
   * The URL to hand a reader of `document` now. An uploaded document is
   * resolved from its own row — for a private one that is a presigned URL,
   * fresh on every read — and a legacy one gives back the URL it was stored
   * with. Call it only after the reader has passed the access check.
   */
  async resolveFileUrl(
    document: Pick<LectureContentDocument, 'file' | 'fileUrl'>,
  ): Promise<string | null> {
    if (document.file) {
      return this.storageUrl.urlFor(fileRefOf(document.file));
    }

    return document.fileUrl ?? null;
  }

  async create(
    createLectureContentDocumentDto: CreateLectureContentDocumentDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createLectureContentDocumentDto.lecture.id,
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

    return this.lectureContentDocumentRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      isDownloadable: createLectureContentDocumentDto.isDownloadable,

      fileName: createLectureContentDocumentDto.fileName,

      fileUrl: createLectureContentDocumentDto.fileUrl,

      file: createLectureContentDocumentDto.file,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lectureContentDocumentRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LectureContentDocument['id']) {
    return this.lectureContentDocumentRepository.findById(id);
  }

  findByIds(ids: LectureContentDocument['id'][]) {
    return this.lectureContentDocumentRepository.findByIds(ids);
  }

  findByLectureId(lectureId: string) {
    return this.lectureContentDocumentRepository.findByLectureId(lectureId);
  }

  async update(
    id: LectureContentDocument['id'],

    updateLectureContentDocumentDto: UpdateLectureContentDocumentDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateLectureContentDocumentDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateLectureContentDocumentDto.lecture.id,
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

    return this.lectureContentDocumentRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      isDownloadable: updateLectureContentDocumentDto.isDownloadable,

      fileName: updateLectureContentDocumentDto.fileName,

      fileUrl: updateLectureContentDocumentDto.fileUrl,

      file: updateLectureContentDocumentDto.file,

      lecture,
    });
  }

  remove(id: LectureContentDocument['id']) {
    return this.lectureContentDocumentRepository.remove(id);
  }
}
