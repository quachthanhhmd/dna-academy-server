import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { SurveyContentAdminService } from './survey-content-admin.service';

const question = (over: Record<string, unknown> = {}) => ({
  id: 'q1',
  lectureId: 'lec-1',
  questionType: 'single_choice',
  questionText: 'Which one?',
  isRequired: true,
  displayOrder: 1,
  ratingMax: null,
  ratingLabelMin: null,
  ratingLabelMax: null,
  archivedAt: null,
  ...over,
});

describe('SurveyContentAdminService', () => {
  let service: SurveyContentAdminService;
  let questions: Record<string, jest.Mock<any>>;
  let options: Record<string, jest.Mock<any>>;
  let answers: Record<string, jest.Mock<any>>;

  beforeEach(() => {
    let created = 0;
    questions = {
      findByLecture: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      createForLecture: (jest.fn() as jest.Mock<any>).mockImplementation(() =>
        Promise.resolve(`new-q${++created}`),
      ),
      patch: jest.fn(),
      archive: jest.fn(),
      removeMany: jest.fn(),
    };
    options = {
      findByQuestions: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
      createForQuestion: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        'new-o',
      ),
      patch: jest.fn(),
      archive: jest.fn(),
      removeMany: jest.fn(),
    };
    answers = {
      countByQuestions: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        new Map(),
      ),
      countByOptions: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        new Map(),
      ),
    };
    service = new SurveyContentAdminService(
      questions as any,
      options as any,
      answers as any,
    );
  });

  it('should create new questions in order, with options only for choices', async () => {
    await service.save('lec-1', [
      {
        questionType: 'single_choice',
        questionText: '  Pick one  ',
        isRequired: true,
        options: [
          { optionText: 'A' },
          { optionText: ' ' },
          { optionText: 'B' },
        ],
      },
      {
        questionType: 'rating_scale',
        questionText: 'How confident?',
        isRequired: false,
        ratingMax: 10,
        ratingLabelMin: 'Low',
        options: [{ optionText: 'ignored' }],
      },
    ] as any);

    expect(questions.createForLecture).toHaveBeenNthCalledWith(1, 'lec-1', {
      questionType: 'single_choice',
      questionText: 'Pick one',
      isRequired: true,
      displayOrder: 1,
      ratingMax: null,
      ratingLabelMin: null,
      ratingLabelMax: null,
    });
    expect(questions.createForLecture).toHaveBeenNthCalledWith(2, 'lec-1', {
      questionType: 'rating_scale',
      questionText: 'How confident?',
      isRequired: false,
      displayOrder: 2,
      ratingMax: 10,
      ratingLabelMin: 'Low',
      ratingLabelMax: null,
    });
    // Blank options are dropped and the rest renumbered; a rating has none.
    expect(options.createForQuestion.mock.calls).toEqual([
      ['new-q1', { optionText: 'A', displayOrder: 1 }],
      ['new-q1', { optionText: 'B', displayOrder: 2 }],
    ]);
  });

  it('should archive a removed question that has answers and delete one that has none', async () => {
    questions.findByLecture.mockResolvedValue([
      question({ id: 'answered' }),
      question({ id: 'unanswered', displayOrder: 2 }),
      question({ id: 'kept', displayOrder: 3, questionType: 'short_text' }),
    ]);
    answers.countByQuestions.mockResolvedValue(new Map([['answered', 4]]));

    await service.save('lec-1', [
      {
        id: 'kept',
        questionType: 'short_text',
        questionText: 'Anything else?',
        isRequired: false,
      },
    ] as any);

    expect(questions.patch).toHaveBeenCalledWith(
      'kept',
      expect.objectContaining({
        displayOrder: 1,
        questionText: 'Anything else?',
      }),
    );
    expect(questions.archive).toHaveBeenCalledWith(['answered']);
    expect(questions.removeMany).toHaveBeenCalledWith(['unanswered']);
  });

  it('should archive a removed option that was chosen and delete one that was not', async () => {
    questions.findByLecture.mockResolvedValue([question()]);
    options.findByQuestions.mockResolvedValue([
      { id: 'o-keep', questionId: 'q1', optionText: 'A', displayOrder: 1 },
      { id: 'o-chosen', questionId: 'q1', optionText: 'B', displayOrder: 2 },
      { id: 'o-never', questionId: 'q1', optionText: 'C', displayOrder: 3 },
    ]);
    answers.countByOptions.mockResolvedValue(new Map([['o-chosen', 2]]));

    await service.save('lec-1', [
      {
        id: 'q1',
        questionType: 'single_choice',
        questionText: 'Which one?',
        isRequired: true,
        options: [{ id: 'o-keep', optionText: 'A!' }, { optionText: 'D' }],
      },
    ] as any);

    expect(options.patch).toHaveBeenCalledWith('o-keep', {
      optionText: 'A!',
      displayOrder: 1,
    });
    expect(options.createForQuestion).toHaveBeenCalledWith('q1', {
      optionText: 'D',
      displayOrder: 2,
    });
    expect(options.archive).toHaveBeenCalledWith(['o-chosen']);
    expect(options.removeMany).toHaveBeenCalledWith(['o-never']);
  });

  it('should refuse a type change on a question that has answers, writing nothing', async () => {
    questions.findByLecture.mockResolvedValue([question()]);
    answers.countByQuestions.mockResolvedValue(new Map([['q1', 1]]));

    await expect(
      service.save('lec-1', [
        {
          id: 'q1',
          questionType: 'long_text',
          questionText: 'Which one?',
          isRequired: true,
        },
      ] as any),
    ).rejects.toMatchObject({
      response: {
        errors: {
          surveyQuestions: { 0: { questionType: 'typeLockedByAnswers' } },
        },
      },
    });
    expect(questions.patch).not.toHaveBeenCalled();
    expect(questions.removeMany).not.toHaveBeenCalled();
  });

  it('should require question text, two options per choice question and at least one question', async () => {
    await expect(service.save('lec-1', [])).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(
      service.save('lec-1', [
        {
          questionType: 'multiple_choice',
          questionText: ' ',
          isRequired: true,
          options: [{ optionText: 'Only one' }],
        },
      ] as any),
    ).rejects.toMatchObject({
      response: {
        errors: {
          surveyQuestions: {
            0: { questionText: 'required', options: 'needsTwoOptions' },
          },
        },
      },
    });
    expect(questions.createForLecture).not.toHaveBeenCalled();
  });

  it('should reject an id that does not belong to this survey', async () => {
    await expect(
      service.save('lec-1', [
        {
          id: '00000000-0000-4000-8000-000000000000',
          questionType: 'short_text',
          questionText: 'Q',
          isRequired: true,
        },
      ] as any),
    ).rejects.toMatchObject({
      response: {
        errors: { surveyQuestions: { 0: { id: 'unknownQuestion' } } },
      },
    });
  });

  it('should report answer counts when the editor reads the survey back', async () => {
    questions.findByLecture.mockResolvedValue([question()]);
    options.findByQuestions.mockResolvedValue([
      { id: 'o1', questionId: 'q1', optionText: 'A', displayOrder: 1 },
    ]);
    answers.countByQuestions.mockResolvedValue(new Map([['q1', 3]]));
    answers.countByOptions.mockResolvedValue(new Map([['o1', 3]]));

    const [view] = (await service.findContent('lec-1'))!;

    expect(view).toMatchObject({
      id: 'q1',
      answerCount: 3,
      options: [{ id: 'o1', optionText: 'A', displayOrder: 1, answerCount: 3 }],
    });
  });

  it('should copy live questions and options to another lesson', async () => {
    questions.findByLecture.mockResolvedValue([question()]);
    options.findByQuestions.mockResolvedValue([
      { id: 'o1', questionId: 'q1', optionText: 'A', displayOrder: 1 },
    ]);

    await service.copy('lec-1', 'lec-2');

    expect(questions.createForLecture).toHaveBeenCalledWith(
      'lec-2',
      expect.objectContaining({ questionText: 'Which one?', displayOrder: 1 }),
    );
    expect(options.createForQuestion).toHaveBeenCalledWith('new-q1', {
      optionText: 'A',
      displayOrder: 1,
    });
  });
});
