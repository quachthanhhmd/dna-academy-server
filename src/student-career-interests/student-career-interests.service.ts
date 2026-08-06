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
import { CreateStudentCareerInterestDto } from './dto/create-student-career-interest.dto';
import { UpdateStudentCareerInterestDto } from './dto/update-student-career-interest.dto';
import { StudentCareerInterestRepository } from './infrastructure/persistence/student-career-interest.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { StudentCareerInterest } from './domain/student-career-interest';

@Injectable()
export class StudentCareerInterestsService {
  constructor(
    private readonly masterDataCodeService: MasterDataCodesService,

    private readonly userService: UsersService,

    // Dependencies here
    private readonly studentCareerInterestRepository: StudentCareerInterestRepository,
  ) {}

  async create(createStudentCareerInterestDto: CreateStudentCareerInterestDto) {
    // Do not remove comment below.
    // <creating-property />

    const careerInterestObject = await this.masterDataCodeService.findById(
      createStudentCareerInterestDto.careerInterest.id,
    );
    if (!careerInterestObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          careerInterest: 'notExists',
        },
      });
    }
    const careerInterest = careerInterestObject;

    const userObject = await this.userService.findById(
      createStudentCareerInterestDto.user.id,
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

    return this.studentCareerInterestRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      customInterest: createStudentCareerInterestDto.customInterest,

      careerInterest,

      user,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.studentCareerInterestRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: StudentCareerInterest['id']) {
    return this.studentCareerInterestRepository.findById(id);
  }

  findByIds(ids: StudentCareerInterest['id'][]) {
    return this.studentCareerInterestRepository.findByIds(ids);
  }

  async update(
    id: StudentCareerInterest['id'],

    updateStudentCareerInterestDto: UpdateStudentCareerInterestDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let careerInterest: MasterDataCode | undefined = undefined;

    if (updateStudentCareerInterestDto.careerInterest) {
      const careerInterestObject = await this.masterDataCodeService.findById(
        updateStudentCareerInterestDto.careerInterest.id,
      );
      if (!careerInterestObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            careerInterest: 'notExists',
          },
        });
      }
      careerInterest = careerInterestObject;
    }

    let user: User | undefined = undefined;

    if (updateStudentCareerInterestDto.user) {
      const userObject = await this.userService.findById(
        updateStudentCareerInterestDto.user.id,
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

    return this.studentCareerInterestRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      customInterest: updateStudentCareerInterestDto.customInterest,

      careerInterest,

      user,
    });
  }

  remove(id: StudentCareerInterest['id']) {
    return this.studentCareerInterestRepository.remove(id);
  }
}
