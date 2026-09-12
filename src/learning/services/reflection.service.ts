import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReflectionQuestionsService } from '../../reflection-questions/reflection-questions.service';
import { ReflectionResponsesService } from '../../reflection-responses/reflection-responses.service';
import { EnrollmentResolverService } from './enrollment-resolver.service';
import { ProgressService } from './progress.service';
import { countWords } from '../word-count';
import { ProgressResultDto } from '../dto/progress.dto';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';

export type ReflectionSubmission = {
  isDraft: boolean;
  answers: { questionId: string; responseText: string }[];
};

@Injectable()
export class ReflectionService {
  constructor(
    private readonly resolver: EnrollmentResolverService,
    private readonly reflectionQuestionsService: ReflectionQuestionsService,
    private readonly reflectionResponsesService: ReflectionResponsesService,
    private readonly progressService: ProgressService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  /**
   * Epic 4 v2.1 §2.4 — one global minimum from REFLECTION_MIN_WORDS.
   * `lecture_content_reflection.minResponseLength` is left in the schema so
   * historical submissions stay explicable, but it no longer gates anything:
   * two lectures disagreeing about what "long enough" means was the thing
   * v2.1 set out to remove.
   */
  private minWords(): number {
    return this.configService.getOrThrow('learning.reflectionMinWords', {
      infer: true,
    });
  }

  /** Epic 4 v2 §2.3 — `GET /lectures/:lectureId/reflection-responses`. */
  async getResponses(lectureId: string, studentId: number) {
    const { enrollment } = await this.resolver.resolveEnrollment(
      lectureId,
      studentId,
    );

    const questions = (
      await this.reflectionQuestionsService.findByLectureId(lectureId)
    ).sort((a, b) => a.displayOrder - b.displayOrder);

    const saved = await this.reflectionResponsesService.findByEnrollmentId(
      enrollment.id,
    );
    const byQuestion = new Map(saved.map((row) => [row.question.id, row]));

    return {
      minResponseLength: this.minWords(),
      questions: questions.map((question) => ({
        id: question.id,
        questionText: question.questionText,
        displayOrder: question.displayOrder,
        responseText: byQuestion.get(question.id)?.responseText ?? null,
        submittedAt: byQuestion.get(question.id)?.submittedAt ?? null,
      })),
    };
  }

  /** Epic 4 v2 §2.3 — `POST /lectures/:lectureId/reflection-responses`. */
  async submit(
    lectureId: string,
    studentId: number,
    submission: ReflectionSubmission,
  ): Promise<ProgressResultDto | { saved: true }> {
    const { enrollment } = await this.resolver.resolveEnrollment(
      lectureId,
      studentId,
    );

    const minWords = this.minWords();
    const questions =
      await this.reflectionQuestionsService.findByLectureId(lectureId);
    const questionIds = new Set(questions.map((question) => question.id));

    for (const answer of submission.answers) {
      if (!questionIds.has(answer.questionId)) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { answers: `unknownQuestion:${answer.questionId}` },
        });
      }
    }

    // A draft saves whatever is typed so far; only a final submit is held to
    // the question set and the minimum length.
    if (!submission.isDraft) {
      const answered = new Map(
        submission.answers.map((answer) => [answer.questionId, answer]),
      );

      for (const question of questions) {
        const answer = answered.get(question.id);

        if (!answer) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: { answers: `missingQuestion:${question.id}` },
          });
        }

        if (countWords(answer.responseText) < minWords) {
          throw new UnprocessableEntityException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            errors: {
              answers: `tooShort:${question.id}`,
              minResponseLength: minWords,
            },
          });
        }
      }
    }

    const saved = await this.reflectionResponsesService.findByEnrollmentId(
      enrollment.id,
    );
    const byQuestion = new Map(saved.map((row) => [row.question.id, row]));
    const submittedAt = submission.isDraft ? undefined : new Date();

    for (const answer of submission.answers) {
      const existing = byQuestion.get(answer.questionId);

      if (existing) {
        await this.reflectionResponsesService.update(existing.id, {
          responseText: answer.responseText,
          ...(submittedAt ? { submittedAt } : {}),
        });
        continue;
      }

      await this.reflectionResponsesService.create({
        enrollment: { id: enrollment.id } as never,
        question: { id: answer.questionId } as never,
        responseText: answer.responseText,
        submittedAt: submittedAt ?? new Date(),
      });
    }

    if (submission.isDraft) {
      return { saved: true };
    }

    return this.progressService.record(lectureId, studentId, {
      status: 'completed',
    });
  }
}
