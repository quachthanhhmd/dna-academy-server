import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { EnrollmentResetService } from './services/enrollment-reset.service';
import { ResetProgressResultDto } from './dto/progress.dto';

/**
 * Epic 4.2 §3.2 — the admin side of the learning journey.
 */
@ApiTags('Admin / Enrollments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({ path: 'admin/enrollments', version: '1' })
export class LearningAdminController {
  constructor(private readonly resetService: EnrollmentResetService) {}

  @ApiOperation({
    summary: "Reset a student's progress on one enrollment",
    description:
      'Clears lecture progress, quiz attempts and answers, quiz drafts, ' +
      'reflection responses and career-reflection answers, then puts the ' +
      'enrollment back to `enrolled`. Exists because one enrollment per ' +
      '(student, course) is enforced by a unique index, which made every ' +
      'learning scenario a one-shot.\n\n' +
      '**The certificate is not deleted.** Its number may already be public ' +
      'on the verification page, and re-completing the course returns the ' +
      'same number. Every call is logged with the acting admin.',
  })
  @RequirePermission('courses', 'edit')
  @Delete(':id/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResetProgressResultDto })
  @ApiNotFoundResponse({ description: 'enrollmentNotFound' })
  resetProgress(
    @Param('id') id: string,
    @Request() request,
  ): Promise<ResetProgressResultDto> {
    return this.resetService.resetProgress(id, request.user.id);
  }
}
