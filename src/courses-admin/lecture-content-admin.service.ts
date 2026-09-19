import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';
import { YoutubeService } from '../youtube/youtube.service';
import { LectureContentVideosService } from '../lecture-content-videos/lecture-content-videos.service';
import { LectureContentArticlesService } from '../lecture-content-articles/lecture-content-articles.service';
import { LectureContentDocumentsService } from '../lecture-content-documents/lecture-content-documents.service';
import { LectureContentQuizzesService } from '../lecture-content-quizzes/lecture-content-quizzes.service';
import { QuizQuestionsService } from '../quiz-questions/quiz-questions.service';
import { QuizAnswerOptionsService } from '../quiz-answer-options/quiz-answer-options.service';
import { LectureContentReflectionsService } from '../lecture-content-reflections/lecture-content-reflections.service';
import { ReflectionQuestionsService } from '../reflection-questions/reflection-questions.service';
import { CourseAggregatesService } from './course-aggregates.service';
import { SaveLectureContentDto } from './dto/save-lecture-content.dto';

@Injectable()
export class LectureContentAdminService {
  constructor(
    private readonly lecturesService: LecturesService,
    private readonly youtubeService: YoutubeService,
    private readonly lectureContentVideosService: LectureContentVideosService,
    private readonly lectureContentArticlesService: LectureContentArticlesService,
    private readonly lectureContentDocumentsService: LectureContentDocumentsService,
    private readonly lectureContentQuizzesService: LectureContentQuizzesService,
    private readonly quizQuestionsService: QuizQuestionsService,
    private readonly quizAnswerOptionsService: QuizAnswerOptionsService,
    private readonly lectureContentReflectionsService: LectureContentReflectionsService,
    private readonly reflectionQuestionsService: ReflectionQuestionsService,
    private readonly courseAggregatesService: CourseAggregatesService,
  ) {}

  /**
   * The lecture's saved content, in the same shape `save` accepts.
   *
   * The editor had no way to read this back: `GET /admin/courses/:id` lists
   * lectures without their content, so reopening a lecture in a later session
   * showed empty fields and saving overwrote real content with whatever was
   * on screen.
   *
   * It returns every field `SaveLectureContentDto` carries, not only the ones
   * the form shows today — a quiz reopened and saved must not silently lose
   * its time limit or its per-question explanations.
   *
   * `null` means "no content row yet", which the controller answers as 204.
   */
  async findContent(
    lectureId: Lecture['id'],
  ): Promise<Record<string, unknown> | null> {
    const lecture = await this.findLectureOrThrow(lectureId);

    switch (lecture.lectureType) {
      case 'video': {
        const video =
          await this.lectureContentVideosService.findByLectureId(lectureId);

        return video
          ? { lectureType: 'video', youtubeUrl: video.youtubeUrl }
          : null;
      }
      case 'article': {
        const article =
          await this.lectureContentArticlesService.findByLectureId(lectureId);

        return article ? { lectureType: 'article', body: article.body } : null;
      }
      case 'pdf_document': {
        const document =
          await this.lectureContentDocumentsService.findByLectureId(lectureId);

        return document
          ? {
              lectureType: 'pdf_document',
              fileUrl: document.fileUrl,
              fileName: document.fileName ?? null,
              isDownloadable: document.isDownloadable,
            }
          : null;
      }
      case 'quiz':
        return this.findQuizContent(lectureId);
      case 'reflection':
        return this.findReflectionContent(lectureId);
      default:
        return null;
    }
  }

  private async findQuizContent(
    lectureId: Lecture['id'],
  ): Promise<Record<string, unknown> | null> {
    const quiz =
      await this.lectureContentQuizzesService.findByLectureId(lectureId);

    if (!quiz) {
      return null;
    }

    const questions =
      await this.quizQuestionsService.findByLectureId(lectureId);
    const options = questions.length
      ? await this.quizAnswerOptionsService.findByQuestionIds(
          questions.map((question) => question.id),
        )
      : [];

    const byQuestion = new Map<string, typeof options>();

    for (const option of options) {
      const list = byQuestion.get(option.question.id) ?? [];
      list.push(option);
      byQuestion.set(option.question.id, list);
    }

    const byDisplayOrder = <T extends { displayOrder: number }>(a: T, b: T) =>
      a.displayOrder - b.displayOrder;

    return {
      lectureType: 'quiz',
      passingScore: quiz.passingScore,
      passThresholdPercent: quiz.passThresholdPercent,
      allowResume: quiz.allowResume,
      instructions: quiz.instructions ?? null,
      timeLimitSecs: quiz.timeLimitSecs ?? null,
      quizQuestions: [...questions].sort(byDisplayOrder).map((question) => ({
        questionText: question.questionText,
        questionType: question.questionType,
        isRequired: question.isRequired,
        displayOrder: question.displayOrder,
        ratingMin: question.ratingMin ?? null,
        ratingMax: question.ratingMax ?? null,
        ratingLabelMin: question.ratingLabelMin ?? null,
        ratingLabelMax: question.ratingLabelMax ?? null,
        minWordCount: question.minWordCount ?? null,
        explanation: question.explanation ?? null,
        allowedMimeTypes: question.allowedMimeTypes ?? null,
        maxFileSizeMb: question.maxFileSizeMb ?? null,
        // `isCorrect` is the answer key. This endpoint is admin-only —
        // the student-facing player strips it.
        options: [...(byQuestion.get(question.id) ?? [])]
          .sort(byDisplayOrder)
          .map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            displayOrder: option.displayOrder,
          })),
      })),
    };
  }

  private async findReflectionContent(
    lectureId: Lecture['id'],
  ): Promise<Record<string, unknown> | null> {
    const reflection =
      await this.lectureContentReflectionsService.findByLectureId(lectureId);

    if (!reflection) {
      return null;
    }

    const questions =
      await this.reflectionQuestionsService.findByLectureId(lectureId);

    return {
      lectureType: 'reflection',
      minResponseLength: reflection.minResponseLength,
      reflectionQuestions: [...questions]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((question) => ({
          questionText: question.questionText,
          displayOrder: question.displayOrder,
        })),
    };
  }

  async save(lectureId: Lecture['id'], dto: SaveLectureContentDto) {
    const lecture = await this.findLectureOrThrow(lectureId);
    const courseId = lecture.section.course.id;
    const previousType = lecture.lectureType;
    const typeChanged = previousType !== dto.lectureType;

    let incompatibleContentCleared = false;
    if (typeChanged) {
      incompatibleContentCleared = await this.clearContentForType(
        lectureId,
        previousType,
      );
      await this.lecturesService.update(lectureId, {
        lectureType: dto.lectureType,
      });
    }

    const content = await this.saveContentForType(lectureId, dto);

    await this.courseAggregatesService.recalculate(courseId);

    return { ...content, incompatibleContentCleared };
  }

  private async saveContentForType(
    lectureId: Lecture['id'],
    dto: SaveLectureContentDto,
  ) {
    switch (dto.lectureType) {
      case 'video':
        return this.saveVideo(lectureId, dto);
      case 'article':
        return this.saveArticle(lectureId, dto);
      case 'pdf_document':
        return this.saveDocument(lectureId, dto);
      case 'quiz':
        return this.saveQuiz(lectureId, dto);
      case 'reflection':
        return this.saveReflection(lectureId, dto);
      default:
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { lectureType: 'invalidLectureType' },
        });
    }
  }

  private async saveVideo(
    lectureId: Lecture['id'],
    dto: SaveLectureContentDto,
  ) {
    if (!dto.youtubeUrl) {
      throw this.missingFieldException('youtubeUrl');
    }

    const youtubeVideoId = await this.youtubeService.validateAndExtractVideoId(
      dto.youtubeUrl,
    );

    const existing =
      await this.lectureContentVideosService.findByLectureId(lectureId);

    if (existing) {
      return this.lectureContentVideosService.update(existing.id, {
        youtubeUrl: dto.youtubeUrl,
        youtubeVideoId,
      });
    }

    return this.lectureContentVideosService.create({
      lecture: { id: lectureId },
      youtubeUrl: dto.youtubeUrl,
      youtubeVideoId,
    });
  }

  private async saveArticle(
    lectureId: Lecture['id'],
    dto: SaveLectureContentDto,
  ) {
    if (!dto.body) {
      throw this.missingFieldException('body');
    }

    const existing =
      await this.lectureContentArticlesService.findByLectureId(lectureId);

    if (existing) {
      return this.lectureContentArticlesService.update(existing.id, {
        body: dto.body,
      });
    }

    return this.lectureContentArticlesService.create({
      lecture: { id: lectureId },
      body: dto.body,
    });
  }

  private async saveDocument(
    lectureId: Lecture['id'],
    dto: SaveLectureContentDto,
  ) {
    if (!dto.fileUrl) {
      throw this.missingFieldException('fileUrl');
    }

    const payload = {
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      isDownloadable: dto.isDownloadable ?? false,
    };

    const existing =
      await this.lectureContentDocumentsService.findByLectureId(lectureId);

    if (existing) {
      return this.lectureContentDocumentsService.update(existing.id, payload);
    }

    return this.lectureContentDocumentsService.create({
      lecture: { id: lectureId },
      ...payload,
    });
  }

  private async saveQuiz(lectureId: Lecture['id'], dto: SaveLectureContentDto) {
    if (dto.passingScore === undefined || dto.allowResume === undefined) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { quiz: 'passingScoreAndAllowResumeRequired' },
      });
    }

    const payload = {
      passingScore: dto.passingScore,
      // Left undefined on purpose when the editor omits it: create then falls
      // back to QUIZ_PASS_THRESHOLD_DEFAULT, and update leaves the stored
      // threshold alone rather than resetting it.
      passThresholdPercent: dto.passThresholdPercent,
      allowResume: dto.allowResume,
      instructions: dto.instructions,
      // Epic 4 v2 §2.1 — null means "no limit", which is what the player
      // needs to hide the timer entirely.
      timeLimitSecs: dto.timeLimitSecs ?? null,
    };

    const existing =
      await this.lectureContentQuizzesService.findByLectureId(lectureId);

    const content = existing
      ? await this.lectureContentQuizzesService.update(existing.id, payload)
      : await this.lectureContentQuizzesService.create({
          lecture: { id: lectureId },
          ...payload,
        });

    const existingQuestions =
      await this.quizQuestionsService.findByLectureId(lectureId);
    if (existingQuestions.length) {
      await this.quizAnswerOptionsService.removeByQuestionIds(
        existingQuestions.map((question) => question.id),
      );
    }
    await this.quizQuestionsService.removeByLectureId(lectureId);

    for (const question of dto.quizQuestions ?? []) {
      const createdQuestion = await this.quizQuestionsService.create({
        lecture: { id: lectureId },
        questionText: question.questionText,
        questionType: question.questionType,
        isRequired: question.isRequired,
        displayOrder: question.displayOrder,
        ratingMin: question.ratingMin,
        ratingMax: question.ratingMax,
        ratingLabelMin: question.ratingLabelMin,
        ratingLabelMax: question.ratingLabelMax,
        minWordCount: question.minWordCount,
        // v2.3 — null rather than undefined so clearing the textarea actually
        // clears the stored explanation instead of leaving the old one.
        explanation: question.explanation ?? null,
        allowedMimeTypes: question.allowedMimeTypes,
        maxFileSizeMb: question.maxFileSizeMb,
      });

      for (const option of question.options ?? []) {
        await this.quizAnswerOptionsService.create({
          question: { id: createdQuestion.id },
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          displayOrder: option.displayOrder,
        });
      }
    }

    return content;
  }

  private async saveReflection(
    lectureId: Lecture['id'],
    dto: SaveLectureContentDto,
  ) {
    if (dto.minResponseLength === undefined) {
      throw this.missingFieldException('minResponseLength');
    }

    const payload = { minResponseLength: dto.minResponseLength };

    const existing =
      await this.lectureContentReflectionsService.findByLectureId(lectureId);

    const content = existing
      ? await this.lectureContentReflectionsService.update(existing.id, payload)
      : await this.lectureContentReflectionsService.create({
          lecture: { id: lectureId },
          ...payload,
        });

    await this.reflectionQuestionsService.removeByLectureId(lectureId);

    for (const question of dto.reflectionQuestions ?? []) {
      await this.reflectionQuestionsService.create({
        lecture: { id: lectureId },
        questionText: question.questionText,
        displayOrder: question.displayOrder,
      });
    }

    return content;
  }

  /**
   * Removes every content row a lecture may hold, whatever its type.
   *
   * Used when deleting a lecture: content rows reference it, so deleting the
   * lecture first is a foreign-key violation — which is what surfaced as a
   * 500 for any lecture that had been filled in. Every type is cleared, not
   * just the current one, because switching a lecture's type can leave the
   * previous content behind.
   */
  async clearAllContent(lectureId: Lecture['id']): Promise<void> {
    for (const type of [
      'video',
      'article',
      'pdf_document',
      'quiz',
      'reflection',
    ]) {
      await this.clearContentForType(lectureId, type);
    }
  }

  /** Deletes any existing content for `type`; returns whether anything was cleared. */
  private async clearContentForType(
    lectureId: Lecture['id'],
    type: string,
  ): Promise<boolean> {
    switch (type) {
      case 'video': {
        const existing =
          await this.lectureContentVideosService.findByLectureId(lectureId);
        if (!existing) return false;
        await this.lectureContentVideosService.remove(existing.id);
        return true;
      }
      case 'article': {
        const existing =
          await this.lectureContentArticlesService.findByLectureId(lectureId);
        if (!existing) return false;
        await this.lectureContentArticlesService.remove(existing.id);
        return true;
      }
      case 'pdf_document': {
        const existing =
          await this.lectureContentDocumentsService.findByLectureId(lectureId);
        if (!existing) return false;
        await this.lectureContentDocumentsService.remove(existing.id);
        return true;
      }
      case 'quiz': {
        const [existingQuiz, questions] = await Promise.all([
          this.lectureContentQuizzesService.findByLectureId(lectureId),
          this.quizQuestionsService.findByLectureId(lectureId),
        ]);

        let cleared = false;
        if (questions.length) {
          await this.quizAnswerOptionsService.removeByQuestionIds(
            questions.map((question) => question.id),
          );
          await this.quizQuestionsService.removeByLectureId(lectureId);
          cleared = true;
        }
        if (existingQuiz) {
          await this.lectureContentQuizzesService.remove(existingQuiz.id);
          cleared = true;
        }
        return cleared;
      }
      case 'reflection': {
        const [existingReflection, questions] = await Promise.all([
          this.lectureContentReflectionsService.findByLectureId(lectureId),
          this.reflectionQuestionsService.findByLectureId(lectureId),
        ]);

        let cleared = false;
        if (questions.length) {
          await this.reflectionQuestionsService.removeByLectureId(lectureId);
          cleared = true;
        }
        if (existingReflection) {
          await this.lectureContentReflectionsService.remove(
            existingReflection.id,
          );
          cleared = true;
        }
        return cleared;
      }
      default:
        return false;
    }
  }

  private missingFieldException(field: string): UnprocessableEntityException {
    return new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { [field]: 'required' },
    });
  }

  private async findLectureOrThrow(id: Lecture['id']): Promise<Lecture> {
    const lecture = await this.lecturesService.findById(id);

    if (!lecture) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'lectureNotFound',
      });
    }

    return lecture;
  }
}
