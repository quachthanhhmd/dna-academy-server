import { MediaFilesService } from '../media-files/media-files.service';
import { MediaFile } from '../media-files/domain/media-file';

import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';

import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CertificateRepository } from './infrastructure/persistence/certificate.repository';
import { omitUndefined } from '../utils/omit-undefined';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Certificate } from './domain/certificate';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly mediaFileService: MediaFilesService,

    private readonly courseService: CoursesService,

    private readonly userService: UsersService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly certificateRepository: CertificateRepository,
  ) {}

  async create(createCertificateDto: CreateCertificateDto) {
    // Do not remove comment below.
    // <creating-property />

    let file: MediaFile | null | undefined = undefined;

    if (createCertificateDto.file) {
      const fileObject = await this.mediaFileService.findById(
        createCertificateDto.file.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'notExists',
          },
        });
      }
      file = fileObject;
    } else if (createCertificateDto.file === null) {
      file = null;
    }

    const courseObject = await this.courseService.findById(
      createCertificateDto.course.id,
    );
    if (!courseObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          course: 'notExists',
        },
      });
    }
    const course = courseObject;

    const studentObject = await this.userService.findById(
      createCertificateDto.student.id,
    );
    if (!studentObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          student: 'notExists',
        },
      });
    }
    const student = studentObject;

    const enrollmentObject = await this.enrollmentService.findById(
      createCertificateDto.enrollment.id,
    );
    if (!enrollmentObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          enrollment: 'notExists',
        },
      });
    }
    const enrollment = enrollmentObject;

    return this.certificateRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      issuedAt: createCertificateDto.issuedAt,

      file,

      completionDate: createCertificateDto.completionDate,

      courseTitleSnapshot: createCertificateDto.courseTitleSnapshot,

      studentNameSnapshot: createCertificateDto.studentNameSnapshot,

      certificateNumber: createCertificateDto.certificateNumber,

      finalGradePct: createCertificateDto.finalGradePct ?? null,

      course,

      student,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.certificateRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Certificate['id']) {
    return this.certificateRepository.findById(id);
  }

  findByIds(ids: Certificate['id'][]) {
    return this.certificateRepository.findByIds(ids);
  }

  /** Epic 4.1 §3.2 — public verification reads the snapshot by number. */
  findByNumber(certificateNumber: string) {
    return this.certificateRepository.findByNumber(certificateNumber);
  }

  findByEnrollmentId(enrollmentId: string) {
    return this.certificateRepository.findByEnrollmentId(enrollmentId);
  }

  /** Epic 4.5 BE-1 — one query for a whole dashboard page. */
  findByEnrollmentIds(enrollmentIds: string[]) {
    return this.certificateRepository.findByEnrollmentIds(enrollmentIds);
  }

  nextSequenceValue() {
    return this.certificateRepository.nextSequenceValue();
  }

  async update(
    id: Certificate['id'],

    updateCertificateDto: UpdateCertificateDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let file: MediaFile | null | undefined = undefined;

    if (updateCertificateDto.file) {
      const fileObject = await this.mediaFileService.findById(
        updateCertificateDto.file.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'notExists',
          },
        });
      }
      file = fileObject;
    } else if (updateCertificateDto.file === null) {
      file = null;
    }

    let course: Course | undefined = undefined;

    if (updateCertificateDto.course) {
      const courseObject = await this.courseService.findById(
        updateCertificateDto.course.id,
      );
      if (!courseObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            course: 'notExists',
          },
        });
      }
      course = courseObject;
    }

    let student: User | undefined = undefined;

    if (updateCertificateDto.student) {
      const studentObject = await this.userService.findById(
        updateCertificateDto.student.id,
      );
      if (!studentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            student: 'notExists',
          },
        });
      }
      student = studentObject;
    }

    let enrollment: Enrollment | undefined = undefined;

    if (updateCertificateDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateCertificateDto.enrollment.id,
      );
      if (!enrollmentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            enrollment: 'notExists',
          },
        });
      }
      enrollment = enrollmentObject;
    }

    return this.certificateRepository.update(
      id,
      // The repository merges `{ ...current, ...payload }`, so a key present
      // with an undefined value erases the stored one. Only send what the
      // caller actually set; an explicit null still comes through.
      omitUndefined({
        // Do not remove comment below.
        // <updating-property-payload />
        issuedAt: updateCertificateDto.issuedAt,

        file,

        completionDate: updateCertificateDto.completionDate,

        courseTitleSnapshot: updateCertificateDto.courseTitleSnapshot,

        studentNameSnapshot: updateCertificateDto.studentNameSnapshot,

        certificateNumber: updateCertificateDto.certificateNumber,

        finalGradePct: updateCertificateDto.finalGradePct,

        course,

        student,

        enrollment,
      }),
    );
  }

  remove(id: Certificate['id']) {
    return this.certificateRepository.remove(id);
  }
}
