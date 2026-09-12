import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { PlayerService } from './services/player.service';
import { ProgressService } from './services/progress.service';
import { LectureViewDto, StartEnrollmentDto } from './dto/player.dto';
import {
  ProgressResultDto,
  RecordProgressDto,
  WatchPositionDto,
} from './dto/progress.dto';

/** Epic 4 v2 §2.3 — player start & navigation. */
@ApiTags('Learning / Player')
@Controller({ version: '1' })
export class LearningPlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly progressService: ProgressService,
  ) {}

  @ApiOperation({
    summary: 'Start an enrollment',
    description:
      'Flips enrolled → in_progress and stamps startedAt. Idempotent: ' +
      'calling it again never resets the date.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Post('enrollments/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: StartEnrollmentDto })
  start(
    @Param('id') id: string,
    @Request() request,
  ): Promise<StartEnrollmentDto> {
    return this.playerService.startEnrollment(id, request.user.id);
  }

  @ApiOperation({
    summary: 'Load a lecture for the player',
    description:
      'Requires an active enrollment. Enforces sequential completion — a ' +
      'locked lecture returns 403 { code: PREVIOUS_LECTURE_INCOMPLETE, ' +
      'requiredLectureId }. Records the lecture as last accessed.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Get('courses/:slug/lectures/:lectureId')
  @ApiOkResponse({ type: LectureViewDto })
  @ApiForbiddenResponse({
    description: 'NOT_ENROLLED or the lecture is locked',
  })
  @ApiNotFoundResponse()
  loadLecture(
    @Param('slug') slug: string,
    @Param('lectureId') lectureId: string,
    @Request() request,
  ): Promise<LectureViewDto> {
    return this.playerService.loadLecture(slug, lectureId, request.user.id);
  }

  @ApiOperation({
    summary: 'Public: load a preview lecture (no auth)',
    description:
      'Only lectures flagged isPreview are served. Never writes progress and ' +
      'ignores the sequential lock.',
  })
  @Get('courses/:slug/preview-lectures/:lectureId')
  @ApiOkResponse({ type: LectureViewDto })
  @ApiForbiddenResponse({ description: 'NOT_A_PREVIEW_LECTURE' })
  previewLecture(
    @Param('slug') slug: string,
    @Param('lectureId') lectureId: string,
  ): Promise<LectureViewDto> {
    return this.playerService.previewLecture(slug, lectureId);
  }

  @ApiOperation({
    summary: 'Record lecture progress',
    description:
      'Upserts lecture_progress, recomputes the enrollment percentage and ' +
      'transitions the enrollment, firing certificate issuance on 100%.\n\n' +
      '**Returns 200, not 201** (Epic 4.2 D10). It is an upsert of a row the ' +
      'client never addresses by id, so there is no created resource to point ' +
      'at — the spec simply never said so and the FE had to accept both.\n\n' +
      '**Status is monotonic** (Epic 4.2 D7): `not_started → in_progress → ' +
      'completed`, one way. A request to move a lecture *down* is accepted ' +
      'and ignored — 200, `progressPct` unchanged, `watchDurationSecs` still ' +
      'written. Re-opening a finished lecture therefore costs the student ' +
      'nothing.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Post('lectures/:lectureId/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ProgressResultDto })
  recordProgress(
    @Param('lectureId') lectureId: string,
    @Body() dto: RecordProgressDto,
    @Request() request,
  ): Promise<ProgressResultDto> {
    return this.progressService.record(lectureId, request.user.id, dto);
  }

  @ApiOperation({
    summary: 'Save the video watch position',
    description:
      'Called on a 15s throttle. Stores watchDurationSecs only — it does not ' +
      'recompute course progress.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Put('lectures/:lectureId/watch-position')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  saveWatchPosition(
    @Param('lectureId') lectureId: string,
    @Body() dto: WatchPositionDto,
    @Request() request,
  ): Promise<void> {
    return this.progressService.saveWatchPosition(
      lectureId,
      request.user.id,
      dto.watchDurationSecs,
    );
  }
}
