import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { QuizQuestionInputDto } from './save-lecture-content.dto';
import { QUESTION_TYPES } from '../../quiz-questions/quiz-question-types';

/**
 * The admin editor is the only way a question type reaches the database, and
 * the grader silently skips any type it does not recognise — an unrecognised
 * question is not merely unscored, it leaves the denominator too, so a quiz
 * made entirely of them scores 0% and can never be passed. Validating here is
 * what turns that into a 422 at authoring time.
 */
describe('QuizQuestionInputDto.questionType', () => {
  const errorsFor = (questionType: string) => {
    const dto = plainToInstance(QuizQuestionInputDto, {
      questionText: 'Q?',
      questionType,
      isRequired: true,
      displayOrder: 1,
    });

    return validateSync(dto).flatMap((error) =>
      error.property === 'questionType' ? [error] : [],
    );
  };

  it.each(QUESTION_TYPES)('should accept %s', (questionType) => {
    expect(errorsFor(questionType)).toHaveLength(0);
  });

  // The names the DTO used to advertise. None of them grade.
  it.each(['single_choice', 'short_text', 'rating', 'multi_select', ''])(
    'should reject the ungradable type %p',
    (questionType) => {
      expect(errorsFor(questionType)).not.toHaveLength(0);
    },
  );
});
