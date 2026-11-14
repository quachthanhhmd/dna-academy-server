import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SurveyQuestionsService } from '../../survey-questions/survey-questions.service';
import { SurveyQuestionOptionsService } from '../../survey-question-options/survey-question-options.service';
import { SurveyResponsesService } from '../../survey-responses/survey-responses.service';
import { SurveyAnswersService } from '../../survey-answers/survey-answers.service';
import { SurveyAnswerRow } from '../../survey-answers/infrastructure/persistence/survey-answer.repository';
import { SURVEY_TEXT_LIMITS } from '../../survey-questions/survey-question-types';
import { EnrollmentResolverService } from './enrollment-resolver.service';
import { ProgressService } from './progress.service';
import { ProgressResultDto } from '../dto/progress.dto';
import { SurveyAnswerInputDto } from '../dto/survey-response.dto';

export type SurveyPlayerQuestion = {
  id: string;
  questionType: string;
  questionText: string;
  isRequired: boolean;
  ratingMax: number | null;
  ratingLabelMin: string | null;
  ratingLabelMax: string | null;
  options: { id: string; optionText: string }[];
};

export type SurveyPlayerAnswer = {
  questionId: string;
  optionIds: string[];
  ratingValue: number | null;
  textAnswer: string | null;
};

/**
 * The learner side of a survey lesson. Submitting stores the answers and
 * completes the lesson; submitting again replaces the answers (the learner
 * may change them) and the lesson stays complete.
 */
@Injectable()
export class SurveyLessonService {
  constructor(
    private readonly resolver: EnrollmentResolverService,
    private readonly questionsService: SurveyQuestionsService,
    private readonly optionsService: SurveyQuestionOptionsService,
    private readonly responsesService: SurveyResponsesService,
    private readonly answersService: SurveyAnswersService,
    private readonly progressService: ProgressService,
  ) {}

  /** The live questions, for the player — archived ones are never shown. */
  async questionsFor(lectureId: string): Promise<SurveyPlayerQuestion[]> {
    const questions = await this.questionsService.findByLecture(lectureId);
    const options = await this.optionsService.findByQuestions(
      questions.map((question) => question.id),
    );
    return questions.map((question) => ({
      id: question.id,
      questionType: question.questionType,
      questionText: question.questionText,
      isRequired: question.isRequired,
      ratingMax: question.ratingMax,
      ratingLabelMin: question.ratingLabelMin,
      ratingLabelMax: question.ratingLabelMax,
      options: options
        .filter((option) => option.questionId === question.id)
        .map((option) => ({ id: option.id, optionText: option.optionText })),
    }));
  }

  /** The learner's saved answers to the live questions, or null before a submit. */
  async myResponse(
    lectureId: string,
    enrollmentId: string,
    questions: SurveyPlayerQuestion[],
  ): Promise<{ submittedAt: Date; answers: SurveyPlayerAnswer[] } | null> {
    const response = await this.responsesService.findOne(
      lectureId,
      enrollmentId,
    );
    if (!response) return null;

    const rows = await this.answersService.findByResponse(response.id);
    const live = new Set(questions.map((question) => question.id));
    const byQuestion = new Map<string, SurveyPlayerAnswer>();
    for (const row of rows) {
      if (!live.has(row.questionId)) continue;
      const answer = byQuestion.get(row.questionId) ?? {
        questionId: row.questionId,
        optionIds: [],
        ratingValue: null,
        textAnswer: null,
      };
      if (row.optionId) answer.optionIds.push(row.optionId);
      if (row.ratingValue !== null) answer.ratingValue = row.ratingValue;
      if (row.textAnswer !== null) answer.textAnswer = row.textAnswer;
      byQuestion.set(row.questionId, answer);
    }

    return {
      submittedAt: response.submittedAt,
      answers: [...byQuestion.values()],
    };
  }

  /** `PUT /lectures/:lectureId/survey-response`. */
  async submit(
    lectureId: string,
    studentId: number,
    answers: SurveyAnswerInputDto[],
  ): Promise<ProgressResultDto> {
    const { enrollment } = await this.resolver.resolveEnrollment(
      lectureId,
      studentId,
    );

    const questions = await this.questionsFor(lectureId);
    if (!questions.length) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'surveyNotFound',
      });
    }

    const rows = this.toRows(questions, answers);
    const responseId = await this.responsesService.upsert(
      lectureId,
      enrollment.id,
      new Date(),
    );
    // Only the live questions are replaced: answers to an archived question
    // from an earlier submit stay for the dashboard.
    await this.answersService.replaceForQuestions(
      responseId,
      questions.map((question) => question.id),
      rows,
    );

    return this.progressService.record(lectureId, studentId, {
      status: 'completed',
    });
  }

  /** Validates every answer against its question and flattens it into rows. */
  private toRows(
    questions: SurveyPlayerQuestion[],
    answers: SurveyAnswerInputDto[],
  ): Omit<SurveyAnswerRow, 'responseId'>[] {
    const byId = new Map(questions.map((question) => [question.id, question]));
    const errors: Record<string, string> = {};
    const rows: Omit<SurveyAnswerRow, 'responseId'>[] = [];
    const answered = new Set<string>();

    for (const answer of answers) {
      const question = byId.get(answer.questionId);
      if (!question) {
        errors[answer.questionId] = 'unknownQuestion';
        continue;
      }
      if (answered.has(question.id)) {
        errors[question.id] = 'duplicateAnswer';
        continue;
      }

      const empty = { optionId: null, ratingValue: null, textAnswer: null };
      switch (question.questionType) {
        case 'single_choice':
        case 'multiple_choice': {
          const optionIds = [...new Set(answer.optionIds ?? [])];
          if (!optionIds.length) break;
          const own = new Set(question.options.map((option) => option.id));
          if (optionIds.some((id) => !own.has(id))) {
            errors[question.id] = 'unknownOption';
            continue;
          }
          if (
            question.questionType === 'single_choice' &&
            optionIds.length > 1
          ) {
            errors[question.id] = 'oneOptionOnly';
            continue;
          }
          for (const optionId of optionIds) {
            rows.push({ ...empty, questionId: question.id, optionId });
          }
          answered.add(question.id);
          break;
        }
        case 'rating_scale': {
          if (answer.ratingValue === undefined || answer.ratingValue === null)
            break;
          if (answer.ratingValue > (question.ratingMax ?? 5)) {
            errors[question.id] = 'ratingOutOfRange';
            continue;
          }
          rows.push({
            ...empty,
            questionId: question.id,
            ratingValue: answer.ratingValue,
          });
          answered.add(question.id);
          break;
        }
        default: {
          const text = answer.textAnswer?.trim();
          if (!text) break;
          if (
            text.length > (SURVEY_TEXT_LIMITS[question.questionType] ?? 5000)
          ) {
            errors[question.id] = 'tooLong';
            continue;
          }
          rows.push({ ...empty, questionId: question.id, textAnswer: text });
          answered.add(question.id);
        }
      }
    }

    for (const question of questions) {
      if (
        question.isRequired &&
        !answered.has(question.id) &&
        !errors[question.id]
      ) {
        errors[question.id] = 'required';
      }
    }

    if (Object.keys(errors).length) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { answers: errors },
      });
    }

    return rows;
  }
}
