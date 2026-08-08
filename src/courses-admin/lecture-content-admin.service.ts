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
      allowResume: dto.allowResume,
      instructions: dto.instructions,
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
