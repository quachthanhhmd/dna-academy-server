import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateMediaFileDto } from './dto/create-media-file.dto';
import { UpdateMediaFileDto } from './dto/update-media-file.dto';
import { MediaFileRepository } from './infrastructure/persistence/media-file.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { MediaFile } from './domain/media-file';

@Injectable()
export class MediaFilesService {
  constructor(
    private readonly userService: UsersService,

    // Dependencies here
    private readonly mediaFileRepository: MediaFileRepository,
  ) {}

  async create(createMediaFileDto: CreateMediaFileDto) {
    // Do not remove comment below.
    // <creating-property />
    let uploadedBy: User | null | undefined = undefined;

    if (createMediaFileDto.uploadedBy) {
      const uploadedByObject = await this.userService.findById(
        createMediaFileDto.uploadedBy.id,
      );
      if (!uploadedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            uploadedBy: 'notExists',
          },
        });
      }
      uploadedBy = uploadedByObject;
    } else if (createMediaFileDto.uploadedBy === null) {
      uploadedBy = null;
    }

    return this.mediaFileRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      uploadedBy,

      status: createMediaFileDto.status,

      sizeBytes: createMediaFileDto.sizeBytes,

      mimeType: createMediaFileDto.mimeType,

      fileName: createMediaFileDto.fileName,

      objectKey: createMediaFileDto.objectKey,

      bucket: createMediaFileDto.bucket,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.mediaFileRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: MediaFile['id']) {
    return this.mediaFileRepository.findById(id);
  }

  findByIds(ids: MediaFile['id'][]) {
    return this.mediaFileRepository.findByIds(ids);
  }

  async update(
    id: MediaFile['id'],

    updateMediaFileDto: UpdateMediaFileDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let uploadedBy: User | null | undefined = undefined;

    if (updateMediaFileDto.uploadedBy) {
      const uploadedByObject = await this.userService.findById(
        updateMediaFileDto.uploadedBy.id,
      );
      if (!uploadedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            uploadedBy: 'notExists',
          },
        });
      }
      uploadedBy = uploadedByObject;
    } else if (updateMediaFileDto.uploadedBy === null) {
      uploadedBy = null;
    }

    return this.mediaFileRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      uploadedBy,

      status: updateMediaFileDto.status,

      sizeBytes: updateMediaFileDto.sizeBytes,

      mimeType: updateMediaFileDto.mimeType,

      fileName: updateMediaFileDto.fileName,

      objectKey: updateMediaFileDto.objectKey,

      bucket: updateMediaFileDto.bucket,
    });
  }

  remove(id: MediaFile['id']) {
    return this.mediaFileRepository.remove(id);
  }
}
