import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { SurveyLessonService } from './survey-lesson.service';

const Q = {
  single: { id: 'q-single', questionType: 'single_choice', isRequired: true },
  multi: { id: 'q-multi', questionType: 'multiple_choice', isRequired: false },
  rating: {
    id: 'q-rating',
    questionType: 'rating_scale',
    isRequired: true,
    ratingMax: 5,
  },
  short: { id: 'q-short', questionType: 'short_text', isRequired: false },
};

describe('SurveyLessonService', () => {
  let service: SurveyLessonService;
  let deps: Record<string, any>;

  beforeEach(() => {
    deps = {
      resolver: {
        resolveEnrollment: (jest.fn() as jest.Mock<any>).mockResolvedValue({
          enrollment: { id: 'enr-1' },
        }),
      },
      questions: {
        findByLecture: (jest.fn() as jest.Mock<any>).mockResolvedValue(
          Object.values(Q).map((q, i) => ({
            ratingMax: null,
            ratingLabelMin: null,
            ratingLabelMax: null,
            questionText: `Q${i}`,
            displayOrder: i + 1,
            ...q,
          })),
        ),
      },
      options: {
        findByQuestions: (jest.fn() as jest.Mock<any>).mockResolvedValue([
          { id: 's1', questionId: 'q-single', optionText: 'A' },
          { id: 's2', questionId: 'q-single', optionText: 'B' },
          { id: 'm1', questionId: 'q-multi', optionText: 'X' },
          { id: 'm2', questionId: 'q-multi', optionText: 'Y' },
        ]),
      },
      responses: {
        upsert: (jest.fn() as jest.Mock<any>).mockResolvedValue('resp-1'),
        findOne: jest.fn(),
      },
      answers: {
        replaceForQuestions: jest.fn(),
        findByResponse: jest.fn(),
      },
      progress: {
        record: (jest.fn() as jest.Mock<any>).mockResolvedValue({}),
      },
    };
    service = new SurveyLessonService(
      deps.resolver,
      deps.questions,
      deps.options,
      deps.responses,
      deps.answers,
      deps.progress,
    );
  });

  it('should store one row per chosen option, rating and text, then complete the lesson', async () => {
    await service.submit('lec-1', 7, [
      { questionId: 'q-single', optionIds: ['s2'] },
      { questionId: 'q-multi', optionIds: ['m1', 'm2'] },
      { questionId: 'q-rating', ratingValue: 4 },
      { questionId: 'q-short', textAnswer: '  More examples  ' },
    ]);

    expect(deps.responses.upsert).toHaveBeenCalledWith(
      'lec-1',
      'enr-1',
      expect.any(Date),
    );
    const [responseId, questionIds, rows] =
      deps.answers.replaceForQuestions.mock.calls[0];
    expect(responseId).toBe('resp-1');
    // Only live questions are replaced, so answers to archived ones survive.
    expect(questionIds).toEqual(['q-single', 'q-multi', 'q-rating', 'q-short']);
    expect(rows).toEqual([
      {
        questionId: 'q-single',
        optionId: 's2',
        ratingValue: null,
        textAnswer: null,
      },
      {
        questionId: 'q-multi',
        optionId: 'm1',
        ratingValue: null,
        textAnswer: null,
      },
      {
        questionId: 'q-multi',
        optionId: 'm2',
        ratingValue: null,
        textAnswer: null,
      },
      {
        questionId: 'q-rating',
        optionId: null,
        ratingValue: 4,
        textAnswer: null,
      },
      {
        questionId: 'q-short',
        optionId: null,
        ratingValue: null,
        textAnswer: 'More examples',
      },
    ]);
    expect(deps.progress.record).toHaveBeenCalledWith('lec-1', 7, {
      status: 'completed',
    });
  });

  it('should allow optional questions to be skipped', async () => {
    await service.submit('lec-1', 7, [
      { questionId: 'q-single', optionIds: ['s1'] },
      { questionId: 'q-rating', ratingValue: 1 },
    ]);

    expect(deps.answers.replaceForQuestions.mock.calls[0][2]).toHaveLength(2);
  });

  it('should 422 every problem at once, keyed by question, writing nothing', async () => {
    await expect(
      service.submit('lec-1', 7, [
        { questionId: 'q-single', optionIds: ['s1', 's2'] },
        { questionId: 'q-multi', optionIds: ['s1'] },
        { questionId: 'q-short', textAnswer: 'x'.repeat(501) },
        { questionId: 'not-a-question', textAnswer: 'hi' },
      ]),
    ).rejects.toMatchObject({
      response: {
        errors: {
          answers: {
            'q-single': 'oneOptionOnly',
            'q-multi': 'unknownOption',
            'q-short': 'tooLong',
            'not-a-question': 'unknownQuestion',
            'q-rating': 'required',
          },
        },
      },
    });
    expect(deps.responses.upsert).not.toHaveBeenCalled();
    expect(deps.progress.record).not.toHaveBeenCalled();
  });

  it('should refuse a rating above the question scale', async () => {
    await expect(
      service.submit('lec-1', 7, [
        { questionId: 'q-single', optionIds: ['s1'] },
        { questionId: 'q-rating', ratingValue: 7 },
      ]),
    ).rejects.toMatchObject({
      response: { errors: { answers: { 'q-rating': 'ratingOutOfRange' } } },
    });
  });

  it('should 404 a lesson with no live questions', async () => {
    deps.questions.findByLecture.mockResolvedValue([]);

    await expect(service.submit('lec-1', 7, [])).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should read back saved answers to live questions only', async () => {
    deps.responses.findOne.mockResolvedValue({
      id: 'resp-1',
      submittedAt: new Date('2026-11-14T00:00:00Z'),
    });
    deps.answers.findByResponse.mockResolvedValue([
      {
        questionId: 'q-multi',
        optionId: 'm1',
        ratingValue: null,
        textAnswer: null,
      },
      {
        questionId: 'q-multi',
        optionId: 'm2',
        ratingValue: null,
        textAnswer: null,
      },
      {
        questionId: 'q-rating',
        optionId: null,
        ratingValue: 3,
        textAnswer: null,
      },
      {
        questionId: 'q-archived',
        optionId: null,
        ratingValue: null,
        textAnswer: 'old',
      },
    ]);
    const questions = await service.questionsFor('lec-1');

    const mine = await service.myResponse('lec-1', 'enr-1', questions);

    expect(mine?.answers).toEqual([
      {
        questionId: 'q-multi',
        optionIds: ['m1', 'm2'],
        ratingValue: null,
        textAnswer: null,
      },
      {
        questionId: 'q-rating',
        optionIds: [],
        ratingValue: 3,
        textAnswer: null,
      },
    ]);
  });
});
