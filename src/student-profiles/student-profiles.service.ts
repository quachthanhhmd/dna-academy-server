import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';

import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { StudentProfileRepository } from './infrastructure/persistence/student-profile.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { StudentProfile } from './domain/student-profile';

@Injectable()
export class StudentProfilesService {
  constructor(
    private readonly masterDataCodeService: MasterDataCodesService,

    private readonly userService: UsersService,

    // Dependencies here
    private readonly studentProfileRepository: StudentProfileRepository,
  ) {}

  async create(createStudentProfileDto: CreateStudentProfileDto) {
    // Do not remove comment below.
    // <creating-property />
    let educationStageCode: MasterDataCode | null | undefined = undefined;

    if (createStudentProfileDto.educationStageCode) {
      const educationStageCodeObject =
        await this.masterDataCodeService.findById(
          createStudentProfileDto.educationStageCode.id,
        );
      if (!educationStageCodeObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            educationStageCode: 'notExists',
          },
        });
      }
      educationStageCode = educationStageCodeObject;
    } else if (createStudentProfileDto.educationStageCode === null) {
      educationStageCode = null;
    }

    const userObject = await this.userService.findById(
      createStudentProfileDto.user.id,
    );
    if (!userObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'notExists',
        },
      });
    }
    const user = userObject;

    return this.studentProfileRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      educationStageCode,

      user,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.studentProfileRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: StudentProfile['id']) {
    return this.studentProfileRepository.findById(id);
  }

  findByIds(ids: StudentProfile['id'][]) {
    return this.studentProfileRepository.findByIds(ids);
  }

  async update(
    id: StudentProfile['id'],

    updateStudentProfileDto: UpdateStudentProfileDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let educationStageCode: MasterDataCode | null | undefined = undefined;

    if (updateStudentProfileDto.educationStageCode) {
      const educationStageCodeObject =
        await this.masterDataCodeService.findById(
          updateStudentProfileDto.educationStageCode.id,
        );
      if (!educationStageCodeObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            educationStageCode: 'notExists',
          },
        });
      }
      educationStageCode = educationStageCodeObject;
    } else if (updateStudentProfileDto.educationStageCode === null) {
      educationStageCode = null;
    }

    let user: User | undefined = undefined;

    if (updateStudentProfileDto.user) {
      const userObject = await this.userService.findById(
        updateStudentProfileDto.user.id,
      );
      if (!userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            user: 'notExists',
          },
        });
      }
      user = userObject;
    }

    return this.studentProfileRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      educationStageCode,

      user,
    });
  }

  remove(id: StudentProfile['id']) {
    return this.studentProfileRepository.remove(id);
  }
}
