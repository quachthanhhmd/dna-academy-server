import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SurveyQuestionsService } from '../survey-questions/survey-questions.service';
import { SurveyQuestionOptionsService } from '../survey-question-options/survey-question-options.service';
import { SurveyAnswersService } from '../survey-answers/survey-answers.service';
import {
  SURVEY_CHOICE_TYPES,
  SURVEY_MIN_OPTIONS,
} from '../survey-questions/survey-question-types';
import { SurveyQuestionRow } from '../survey-questions/infrastructure/persistence/survey-question.repository';
import { SurveyOptionRow } from '../survey-question-options/infrastructure/persistence/survey-question-option.repository';
import { SurveyQuestionInputDto } from './dto/save-lecture-content.dto';

/** What the editor reads back: the save shape plus how much each part was answered. */
export type SurveyQuestionView = {
  id: string;
  questionType: string;
  questionText: string;
  isRequired: boolean;
  displayOrder: number;
  ratingMax: number | null;
  ratingLabelMin: string | null;
  ratingLabelMax: string | null;
  /** Answers already given — a question with any cannot change its type. */
  answerCount: number;
  options: {
    id: string;
    optionText: string;
    displayOrder: number;
    answerCount: number;
  }[];
};

const isChoice = (type: string) => SURVEY_CHOICE_TYPES.includes(type);

/**
 * The authoring side of a survey lesson.
 *
 * Questions and options keep their ids across edits, so answers already
 * given keep pointing at them. Removing one that has answers archives it
 * (learners stop seeing it, the dashboard keeps its answers); removing one
 * nobody answered deletes it outright.
 */
@Injectable()
export class SurveyContentAdminService {
  constructor(
    private readonly questionsService: SurveyQuestionsService,
    private readonly optionsService: SurveyQuestionOptionsService,
    private readonly answersService: SurveyAnswersService,
  ) {}

  async hasContent(lectureId: string): Promise<boolean> {
    return (await this.questionsService.findByLecture(lectureId)).length > 0;
  }

  async findContent(lectureId: string): Promise<SurveyQuestionView[] | null> {
    const questions = await this.questionsService.findByLecture(lectureId);
    if (!questions.length) return null;

    const options = await this.optionsService.findByQuestions(
      questions.map((question) => question.id),
    );
    const [questionAnswers, optionAnswers] = await Promise.all([
      this.answersService.countByQuestions(questions.map((q) => q.id)),
      this.answersService.countByOptions(options.map((o) => o.id)),
    ]);

    return questions.map((question) => ({
      id: question.id,
      questionType: question.questionType,
      questionText: question.questionText,
      isRequired: question.isRequired,
      displayOrder: question.displayOrder,
      ratingMax: question.ratingMax,
      ratingLabelMin: question.ratingLabelMin,
      ratingLabelMax: question.ratingLabelMax,
      answerCount: questionAnswers.get(question.id) ?? 0,
      options: options
        .filter((option) => option.questionId === question.id)
        .map((option) => ({
          id: option.id,
          optionText: option.optionText,
          displayOrder: option.displayOrder,
          answerCount: optionAnswers.get(option.id) ?? 0,
        })),
    }));
  }

  async save(lectureId: string, input: SurveyQuestionInputDto[] | undefined) {
    const questions = input ?? [];
    const existing = await this.questionsService.findByLecture(lectureId);
    const existingById = new Map(existing.map((q) => [q.id, q]));
    const existingOptions = await this.optionsService.findByQuestions(
      existing.map((q) => q.id),
    );
    const answersByQuestion = await this.answersService.countByQuestions(
      existing.map((q) => q.id),
    );

    this.validate(questions, existingById, existingOptions, answersByQuestion);

    const keptIds = new Set<string>();
    for (const [index, question] of questions.entries()) {
      const fields = {
        questionType: question.questionType,
        questionText: question.questionText.trim(),
        isRequired: question.isRequired,
        displayOrder: index + 1,
        ratingMax:
          question.questionType === 'rating_scale'
            ? (question.ratingMax ?? 5)
            : null,
        ratingLabelMin:
          question.questionType === 'rating_scale'
            ? question.ratingLabelMin?.trim() || null
            : null,
        ratingLabelMax:
          question.questionType === 'rating_scale'
            ? question.ratingLabelMax?.trim() || null
            : null,
      };

      let questionId: string;
      if (question.id) {
        questionId = question.id;
        await this.questionsService.patch(questionId, fields);
      } else {
        questionId = await this.questionsService.createForLecture(
          lectureId,
          fields,
        );
      }
      keptIds.add(questionId);

      await this.saveOptions(
        questionId,
        isChoice(question.questionType) ? (question.options ?? []) : [],
        existingOptions.filter((option) => option.questionId === questionId),
      );
    }

    await this.removeQuestions(
      existing.filter((question) => !keptIds.has(question.id)),
    );

    return {
      lectureType: 'survey',
      surveyQuestions: await this.findContent(lectureId),
    };
  }

  /** Clears a survey whose lesson changed type, keeping every answered part. */
  async clear(lectureId: string): Promise<boolean> {
    const existing = await this.questionsService.findByLecture(lectureId);
    if (!existing.length) return false;
    await this.removeQuestions(existing);
    return true;
  }

  /** Copies the live questions and options (never the answers) to another lesson. */
  async copy(fromLectureId: string, toLectureId: string): Promise<void> {
    const questions = await this.questionsService.findByLecture(fromLectureId);
    const options = await this.optionsService.findByQuestions(
      questions.map((question) => question.id),
    );

    for (const question of questions) {
      const copiedId = await this.questionsService.createForLecture(
        toLectureId,
        {
          questionType: question.questionType,
          questionText: question.questionText,
          isRequired: question.isRequired,
          displayOrder: question.displayOrder,
          ratingMax: question.ratingMax,
          ratingLabelMin: question.ratingLabelMin,
          ratingLabelMax: question.ratingLabelMax,
        },
      );
      for (const option of options.filter(
        (o) => o.questionId === question.id,
      )) {
        await this.optionsService.createForQuestion(copiedId, {
          optionText: option.optionText,
          displayOrder: option.displayOrder,
        });
      }
    }
  }

  private validate(
    questions: SurveyQuestionInputDto[],
    existingById: Map<string, SurveyQuestionRow>,
    existingOptions: SurveyOptionRow[],
    answersByQuestion: Map<string, number>,
  ) {
    if (!questions.length) {
      throw this.error({ surveyQuestions: 'required' });
    }

    const errors: Record<number, Record<string, string>> = {};
    const fail = (index: number, field: string, code: string) => {
      errors[index] = { ...errors[index], [field]: code };
    };

    questions.forEach((question, index) => {
      if (!question.questionText.trim())
        fail(index, 'questionText', 'required');

      if (question.id) {
        const current = existingById.get(question.id);
        if (!current) {
          fail(index, 'id', 'unknownQuestion');
        } else if (
          current.questionType !== question.questionType &&
          (answersByQuestion.get(question.id) ?? 0) > 0
        ) {
          // Answers recorded against one type cannot be read as another.
          fail(index, 'questionType', 'typeLockedByAnswers');
        }
      }

      if (isChoice(question.questionType)) {
        const filled = (question.options ?? []).filter((option) =>
          option.optionText.trim(),
        );
        if (filled.length < SURVEY_MIN_OPTIONS) {
          fail(index, 'options', 'needsTwoOptions');
        }
        const ownOptionIds = new Set(
          existingOptions
            .filter((option) => option.questionId === question.id)
            .map((option) => option.id),
        );
        if (
          (question.options ?? []).some(
            (option) => option.id && !ownOptionIds.has(option.id),
          )
        ) {
          fail(index, 'options', 'unknownOption');
        }
      }
    });

    if (Object.keys(errors).length) {
      throw this.error({ surveyQuestions: errors });
    }
  }

  private async saveOptions(
    questionId: string,
    input: { id?: string; optionText: string }[],
    existing: SurveyOptionRow[],
  ) {
    const kept = new Set<string>();
    let order = 0;
    for (const option of input) {
      const optionText = option.optionText.trim();
      if (!optionText) continue;
      order += 1;
      if (option.id) {
        await this.optionsService.patch(option.id, {
          optionText,
          displayOrder: order,
        });
        kept.add(option.id);
      } else {
        await this.optionsService.createForQuestion(questionId, {
          optionText,
          displayOrder: order,
        });
      }
    }

    const removed = existing.filter((option) => !kept.has(option.id));
    if (!removed.length) return;
    const chosen = await this.answersService.countByOptions(
      removed.map((option) => option.id),
    );
    await this.optionsService.archive(
      removed.filter((o) => chosen.has(o.id)).map((o) => o.id),
    );
    await this.optionsService.removeMany(
      removed.filter((o) => !chosen.has(o.id)).map((o) => o.id),
    );
  }

  private async removeQuestions(removed: SurveyQuestionRow[]) {
    if (!removed.length) return;
    const answered = await this.answersService.countByQuestions(
      removed.map((question) => question.id),
    );
    await this.questionsService.archive(
      removed.filter((q) => answered.has(q.id)).map((q) => q.id),
    );
    // Deleting a question deletes its options with it (ON DELETE CASCADE).
    await this.questionsService.removeMany(
      removed.filter((q) => !answered.has(q.id)).map((q) => q.id),
    );
  }

  private error(errors: Record<string, unknown>) {
    return new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
    });
  }
}
