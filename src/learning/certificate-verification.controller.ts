import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { CertificateVerificationService } from './services/certificate-verification.service';
import { CertificateVerificationDto } from './dto/completion.dto';

/** One minute, in milliseconds. */
const ONE_MINUTE = 60_000;

/**
 * Epic 4.1 D3 — `STU_CVF_11`, the public certificate check.
 *
 * Its own top-level path on purpose: `/certificates` belongs to the generated
 * CRUD controller, whose `@Get(':id')` sits behind a permission and would
 * shadow (or be shadowed by) a `verify` segment depending on module
 * registration order.
 */
@ApiTags('Certificate Verification')
@Controller({ version: '1' })
export class CertificateVerificationController {
  constructor(
    private readonly verificationService: CertificateVerificationService,
  ) {}

  @ApiOperation({
    summary: 'Check a certificate number (public)',
    description:
      'Returns the snapshot fields only, with the student name masked. An ' +
      'unknown number and a malformed one return the same body, so the ' +
      'endpoint cannot be used to discover which numbers exist.',
  })
  // The numbers are sequential, so this endpoint is walkable by design. The
  // limiter is what makes walking it slow enough to be useless.
  @UseGuards(RateLimitGuard)
  @RateLimit(20, ONE_MINUTE)
  @Get('certificate-verify/:number')
  @ApiOkResponse({ type: CertificateVerificationDto })
  @ApiNotFoundResponse({ description: '{ "valid": false }' })
  @ApiTooManyRequestsResponse({ description: '{ code: "RATE_LIMITED" }' })
  verify(@Param('number') number: string): Promise<CertificateVerificationDto> {
    return this.verificationService.verify(number);
  }
}
