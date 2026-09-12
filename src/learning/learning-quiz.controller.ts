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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { QuizService } from './services/quiz.service';
import { QuizFileUploadService } from './services/quiz-file-upload.service';
import { QUIZ_UPLOAD_MULTER_OPTIONS } from './quiz-upload-multer.options';
import {
  QuizAnswerFileDto,
  QuizAttemptDto,
  QuizResultDto,
  SaveQuizDraftDto,
  SubmitQuizDto,
} from './dto/quiz.dto';

/** Epic 4 v2 §2.3 — quiz flow. */
@ApiTags('Learning / Quiz')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OnboardingGuard)
@Controller({ version: '1' })
export class LearningQuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizFileUploadService: QuizFileUploadService,
  ) {}

  @ApiOperation({
    summary: 'Start a quiz attempt',
    description:
      'Returns the questions with answer options stripped of isCorrect, plus ' +
      'any resumable draft. Retakes are unlimited.',
  })
  @Post('lectures/:lectureId/quiz-attempts')
  @ApiCreatedResponse({ type: QuizAttemptDto })
  start(
    @Param('lectureId') lectureId: string,
    @Request() request,
  ): Promise<QuizAttemptDto> {
    return this.quizService.startAttempt(lectureId, request.user.id);
  }

  @ApiOperation({ summary: 'Save a quiz draft (30s autosave)' })
  @Put('lectures/:lectureId/quiz-save')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  saveDraft(
    @Param('lectureId') lectureId: string,
    @Body() dto: SaveQuizDraftDto,
    @Request() request,
  ): Promise<void> {
    return this.quizService.saveDraft(
      lectureId,
      request.user.id,
      dto.answersJson,
    );
  }

  @ApiOperation({
    summary: 'Submit a quiz attempt',
    description:
      'Auto-grades the objective questions. When an essay or upload was ' +
      'answered, passed comes back null until an admin grades it. A passing ' +
      'attempt marks the lecture complete.',
  })
  @Post('quiz-attempts/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: QuizResultDto })
  @ApiConflictResponse({ description: 'ATTEMPT_ALREADY_SUBMITTED' })
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitQuizDto,
    @Request() request,
  ): Promise<QuizResultDto> {
    return this.quizService.submit(id, request.user.id, dto.answers);
  }

  @ApiOperation({
    summary: 'Get an attempt, with review data once submitted',
  })
  @Get('quiz-attempts/:id/review')
  @ApiOkResponse()
  getAttempt(@Param('id') id: string, @Request() request) {
    return this.quizService.getAttempt(id, request.user.id);
  }

  @ApiOperation({
    summary: 'Attach a file to a file_upload question',
    description:
      'Stores the file through the active file driver and returns the id to ' +
      "send back as answers[].fileId on submit. Enforces the question's own " +
      'allowedMimeTypes and maxFileSizeMb.',
  })
  @Post('quiz-attempts/:id/answers/:questionId/file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', QUIZ_UPLOAD_MULTER_OPTIONS))
  @ApiCreatedResponse({ type: QuizAnswerFileDto })
  @ApiConflictResponse({ description: 'ATTEMPT_ALREADY_SUBMITTED' })
  uploadAnswerFile(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() request,
  ): Promise<QuizAnswerFileDto> {
    return this.quizFileUploadService.upload(
      id,
      questionId,
      request.user.id,
      file,
    );
  }
}
