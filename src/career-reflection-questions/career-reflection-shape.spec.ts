import { describe, expect, it } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import {
  assertQuestionShape,
  isAllowedAnswerValue,
} from './career-reflection-shape';

describe('assertQuestionShape', () => {
  const slider = { questionType: 'slider' as const };
  const opts = [
    { value: 1, label: 'Cần luyện thêm' },
    { value: 2, label: 'Tốt' },
    { value: 3, label: 'Rất tốt' },
  ];

  it('should accept a slider with end labels and no options', () => {
    expect(() =>
      assertQuestionShape({ ...slider, labelMin: 'Thấp', labelMax: 'Cao' }),
    ).not.toThrow();
  });

  // D1 — labelMin/labelMax describe the two ends of a slider. There is nowhere
  // on a slider to put "Low / Med / High", which is the whole reason options
  // exists; letting a slider carry them would put the form back where it was.
  it('should reject a slider that carries options', () => {
    expect(() => assertQuestionShape({ ...slider, options: opts })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('should name the field when a slider carries options', () => {
    expect(() => assertQuestionShape({ ...slider, options: opts })).toThrow(
      expect.objectContaining({
        response: { status: 422, errors: { options: 'notAllowedForType' } },
      }) as unknown as Error,
    );
  });

  it.each(['radio', 'select'])('should accept a %s with options', (type) => {
    expect(() =>
      assertQuestionShape({ questionType: type, options: opts }),
    ).not.toThrow();
  });

  it.each(['radio', 'select'])('should reject a %s with no options', (type) => {
    expect(() => assertQuestionShape({ questionType: type })).toThrow(
      expect.objectContaining({
        response: { status: 422, errors: { options: 'requiredForType' } },
      }) as unknown as Error,
    );
  });

  it('should reject an empty options array', () => {
    expect(() =>
      assertQuestionShape({ questionType: 'radio', options: [] }),
    ).toThrow(UnprocessableEntityException);
  });

  it('should reject fewer than two options', () => {
    expect(() =>
      assertQuestionShape({ questionType: 'radio', options: [opts[0]] }),
    ).toThrow(UnprocessableEntityException);
  });

  it('should reject more than seven options', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      value: i + 1,
      label: `L${i}`,
    }));

    expect(() =>
      assertQuestionShape({ questionType: 'radio', options: many }),
    ).toThrow(UnprocessableEntityException);
  });

  it('should accept exactly two and exactly seven options', () => {
    const two = opts.slice(0, 2);
    const seven = Array.from({ length: 7 }, (_, i) => ({
      value: i + 1,
      label: `L${i}`,
    }));

    expect(() =>
      assertQuestionShape({ questionType: 'radio', options: two }),
    ).not.toThrow();
    expect(() =>
      assertQuestionShape({ questionType: 'radio', options: seven }),
    ).not.toThrow();
  });

  it('should reject an unknown question type', () => {
    expect(() =>
      assertQuestionShape({ questionType: 'freetext', options: opts }),
    ).toThrow(
      expect.objectContaining({
        response: { status: 422, errors: { questionType: 'unsupported' } },
      }) as unknown as Error,
    );
  });

  it('should reject duplicate option values', () => {
    expect(() =>
      assertQuestionShape({
        questionType: 'radio',
        options: [
          { value: 1, label: 'A' },
          { value: 1, label: 'B' },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        response: { status: 422, errors: { options: 'duplicateValue' } },
      }) as unknown as Error,
    );
  });

  it('should reject an option with a non-numeric value', () => {
    expect(() =>
      assertQuestionShape({
        questionType: 'radio',
        options: [
          { value: 'one', label: 'A' },
          { value: 2, label: 'B' },
        ] as never,
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('should reject an option with a blank label', () => {
    expect(() =>
      assertQuestionShape({
        questionType: 'radio',
        options: [
          { value: 1, label: '  ' },
          { value: 2, label: 'B' },
        ],
      }),
    ).toThrow(UnprocessableEntityException);
  });

  // D2 — two questions whose scales ran in opposite directions were both
  // averaged into the same category bucket. Ascending order is the invariant
  // that makes the aggregate mean anything.
  it('should reject options that do not ascend', () => {
    expect(() =>
      assertQuestionShape({
        questionType: 'select',
        options: [
          { value: 3, label: 'Perfect' },
          { value: 2, label: 'Good' },
          { value: 1, label: 'Need Practice' },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        response: { status: 422, errors: { options: 'mustAscend' } },
      }) as unknown as Error,
    );
  });
});

describe('isAllowedAnswerValue', () => {
  const radio = {
    questionType: 'radio',
    options: [
      { value: 1, label: 'A' },
      { value: 3, label: 'B' },
    ],
  };

  it('should accept a declared option value', () => {
    expect(isAllowedAnswerValue(radio, 3)).toBe(true);
  });

  it('should reject a value that is not declared', () => {
    expect(isAllowedAnswerValue(radio, 2)).toBe(false);
  });

  // The trap D2 exists to close: sending the array index instead of the value.
  it('should reject an array index that is not also a declared value', () => {
    expect(isAllowedAnswerValue(radio, 0)).toBe(false);
  });

  it.each([1, 3, 5])('should accept %i on a slider', (value) => {
    expect(isAllowedAnswerValue({ questionType: 'slider' }, value)).toBe(true);
  });

  it.each([0, 6, -1])('should reject %i on a slider', (value) => {
    expect(isAllowedAnswerValue({ questionType: 'slider' }, value)).toBe(false);
  });

  it('should reject a non-integer', () => {
    expect(isAllowedAnswerValue({ questionType: 'slider' }, 2.5)).toBe(false);
    expect(isAllowedAnswerValue(radio, 1.0000001)).toBe(false);
  });

  it('should reject a null or undefined answer', () => {
    expect(isAllowedAnswerValue(radio, null)).toBe(false);
    expect(isAllowedAnswerValue(radio, undefined)).toBe(false);
  });

  it('should reject anything on a radio with no options stored', () => {
    expect(isAllowedAnswerValue({ questionType: 'radio' }, 1)).toBe(false);
  });
});
