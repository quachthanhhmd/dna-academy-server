import { Injectable } from '@nestjs/common';
import { LectureContentVideosService } from '../../lecture-content-videos/lecture-content-videos.service';
import { LectureContentArticlesService } from '../../lecture-content-articles/lecture-content-articles.service';
import { LectureContentDocumentsService } from '../../lecture-content-documents/lecture-content-documents.service';
import { LectureContentQuizzesService } from '../../lecture-content-quizzes/lecture-content-quizzes.service';
import { LectureContentReflectionsService } from '../../lecture-content-reflections/lecture-content-reflections.service';
import { QuizQuestionsService } from '../../quiz-questions/quiz-questions.service';
import { ReflectionQuestionsService } from '../../reflection-questions/reflection-questions.service';
import { QuizAttemptsService } from '../../quiz-attempts/quiz-attempts.service';
import { bestScore } from '../best-score';
import { sanitizeHtml } from '../sanitize-html';

/**
 * Loads the type-specific payload for a lecture (Epic 4 v2 §5.4–§5.7).
 *
 * Quiz payloads deliberately never carry `isCorrect` or the answer
 * explanation — those only appear in the review projection after submission.
 */
@Injectable()
export class LectureContentService {
  constructor(
    private readonly videosService: LectureContentVideosService,
    private readonly articlesService: LectureContentArticlesService,
    private readonly documentsService: LectureContentDocumentsService,
    private readonly quizzesService: LectureContentQuizzesService,
    private readonly reflectionsService: LectureContentReflectionsService,
    private readonly quizQuestionsService: QuizQuestionsService,
    private readonly reflectionQuestionsService: ReflectionQuestionsService,
    private readonly quizAttemptsService: QuizAttemptsService,
  ) {}

  async payloadFor(
    lectureId: string,
    lectureType: string,
    /**
     * Epic 4.2 §3.1 — needed only for the quiz branch's attempt history.
     * Absent for a guest preview, which by definition has no attempts.
     */
    enrollmentId?: string,
  ): Promise<Record<string, unknown> | null> {
    switch (lectureType) {
      case 'video': {
        const video = await this.videosService.findByLectureId(lectureId);
        return video
          ? {
              youtubeVideoId: video.youtubeVideoId,
              youtubeUrl: video.youtubeUrl,
            }
          : null;
      }

      case 'article': {
        const article = await this.articlesService.findByLectureId(lectureId);
        // Sanitized server-side (§5.5) so the client never has to trust it.
        return article ? { bodyHtml: sanitizeHtml(article.body) } : null;
      }

      case 'pdf_document': {
        const doc = await this.documentsService.findByLectureId(lectureId);
        return doc
          ? {
              fileUrl: doc.fileUrl,
              fileName: doc.fileName ?? null,
              isDownloadable: doc.isDownloadable,
            }
          : null;
      }

      case 'quiz': {
        const quiz = await this.quizzesService.findByLectureId(lectureId);
        if (!quiz) {
          return null;
        }

        const questions =
          await this.quizQuestionsService.findByLectureId(lectureId);

        // Epic 4.2 §3.1 / D9 — BUG-06. The instructions screen needs these
        // two, and the only way to get them used to be POST .../quiz-attempts,
        // which creates a row on every call — so reading the attempt count
        // incremented it. Read-only here.
        const attempts = enrollmentId
          ? await this.quizAttemptsService.findByEnrollmentAndLecture(
              enrollmentId,
              lectureId,
            )
          : [];

        return {
          instructions: quiz.instructions ?? null,
          // §5.6 — the instructions screen labels this "Pass threshold".
          // passingScore rides along only until the FE stops reading it.
          passThresholdPercent: quiz.passThresholdPercent,
          passingScore: quiz.passingScore,
          allowResume: quiz.allowResume,
          timeLimitSecs: quiz.timeLimitSecs ?? null,
          questionCount: questions.length,
          previousAttempts: attempts.length,
          bestScore: bestScore(attempts),
        };
      }

      case 'reflection': {
        const reflection =
          await this.reflectionsService.findByLectureId(lectureId);
        if (!reflection) {
          return null;
        }

        const questions =
          await this.reflectionQuestionsService.findByLectureId(lectureId);

        return {
          minResponseLength: reflection.minResponseLength,
          questions: questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question) => ({
              id: question.id,
              questionText: question.questionText,
              displayOrder: question.displayOrder,
            })),
        };
      }

      default:
        return null;
    }
  }
}
