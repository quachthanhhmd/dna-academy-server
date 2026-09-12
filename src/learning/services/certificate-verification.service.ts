import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CertificatesService } from '../../certificates/certificates.service';
import { AllConfigType } from '../../config/config.type';
import { maskStudentName } from '../mask-student-name';
import { CertificateVerificationDto } from '../dto/completion.dto';

/**
 * `DNA-<4-digit year>-<6-digit sequence>` — the shape
 * `CertificateGeneratorService` mints. Anything else cannot exist, so it is
 * rejected before a query runs.
 */
const CERTIFICATE_NUMBER_PATTERN = /^DNA-\d{4}-\d{6}$/;

/**
 * Epic 4.1 D3 — `GET /certificate-verify/:number`, public and unauthenticated.
 *
 * Certificate numbers come from a Postgres sequence starting at 1, so
 * `DNA-2026-000001` upward walks every certificate the platform has ever
 * issued. That makes this endpoint a potential export of the customer list,
 * and it is why:
 *
 * - the student name is masked (`Nguyễn Văn A.`),
 * - only snapshot columns are read — never `user`, `enrollment` or `course`,
 * - a malformed number and an unknown one return the *same* `{ valid: false }`,
 *   so the response cannot be used to learn which numbers are well-formed,
 * - and the route is rate-limited per IP.
 *
 * It lives at a distinct top-level path rather than under `/certificates`,
 * whose generated CRUD controller owns `@Get(':id')` behind a permission —
 * a public `verify` segment there would be swallowed or not depending on
 * module registration order.
 */
@Injectable()
export class CertificateVerificationService {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async verify(rawNumber: string): Promise<CertificateVerificationDto> {
    const number = (rawNumber ?? '').trim().toUpperCase();

    if (!CERTIFICATE_NUMBER_PATTERN.test(number)) {
      // Deliberately identical to the not-found case, and deliberately before
      // the query: no lookup, no timing difference, no signal.
      this.notFound();
    }

    const certificate = await this.certificatesService.findByNumber(number);

    if (!certificate) {
      this.notFound();
    }

    return {
      valid: true,
      number: certificate!.certificateNumber,
      studentName: maskStudentName(certificate!.studentNameSnapshot),
      courseTitle: certificate!.courseTitleSnapshot,
      completionDate: certificate!.completionDate,
      issuerName: this.configService.getOrThrow('certificate.issuerName', {
        infer: true,
      }),
    };
  }

  private notFound(): never {
    // Exactly `{ valid: false }` — §3.2 pins the public body, and the usual
    // `status` echo this codebase adds elsewhere is one more field on a page
    // anyone can hit. Nothing here should say more than "no".
    throw new NotFoundException({ valid: false });
  }
}
