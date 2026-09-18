import { describe, expect, it } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import {
  assertQuestionShape,
  isAllowedOptionKey,
} from './career-reflection-shape';

const code = (field: string, value: string) =>
  expect.objectContaining({
    response: { status: 422, errors: { [field]: value } },
  }) as unknown as Error;

/** Epic 4.6 §2.2 — what a question row is allowed to look like. */
describe('assertQuestionShape', () => {
  const options = [
    { key: 1, label: 'Chắc chắn' },
    { key: 2, label: 'Không phải lúc này' },
  ];

  describe('free_text', () => {
    it('should accept a free_text question with no options', () => {
      expect(() =>
        assertQuestionShape({ questionType: 'free_text', options: null }),
      ).not.toThrow();
    });

    it('should reject a free_text question that carries options', () => {
      expect(() =>
        assertQuestionShape({ questionType: 'free_text', options }),
      ).toThrow(code('options', 'notAllowedForType'));
    });
  });

  describe('selection', () => {
    it('should accept a selection with two options', () => {
      expect(() =>
        assertQuestionShape({ questionType: 'selection', options }),
      ).not.toThrow();
    });

    it('should reject a selection with no options', () => {
      expect(() => assertQuestionShape({ questionType: 'selection' })).toThrow(
        code('options', 'requiredForType'),
      );
    });

    it('should reject an empty options array', () => {
      expect(() =>
        assertQuestionShape({ questionType: 'selection', options: [] }),
      ).toThrow(UnprocessableEntityException);
    });

    it('should reject a single option', () => {
      expect(() =>
        assertQuestionShape({
          questionType: 'selection',
          options: [options[0]],
        }),
      ).toThrow(code('options', 'outOfRange'));
    });

    it('should reject more than seven options', () => {
      const eight = Array.from({ length: 8 }, (_, i) => ({
        key: i + 1,
        label: `Lựa chọn ${i + 1}`,
      }));

      expect(() =>
        assertQuestionShape({ questionType: 'selection', options: eight }),
      ).toThrow(code('options', 'outOfRange'));
    });

    it('should reject a duplicate key', () => {
      expect(() =>
        assertQuestionShape({
          questionType: 'selection',
          options: [
            { key: 1, label: 'A' },
            { key: 1, label: 'B' },
          ],
        }),
      ).toThrow(code('options', 'duplicateKey'));
    });

    it.each([0, -1, 1.5])('should reject key %p', (key) => {
      expect(() =>
        assertQuestionShape({
          questionType: 'selection',
          options: [
            { key, label: 'A' },
            { key: 2, label: 'B' },
          ],
        }),
      ).toThrow(code('options', 'keyMustBePositiveInteger'));
    });

    it('should reject a blank label', () => {
      expect(() =>
        assertQuestionShape({
          questionType: 'selection',
          options: [
            { key: 1, label: '   ' },
            { key: 2, label: 'B' },
          ],
        }),
      ).toThrow(code('options', 'labelRequired'));
    });

    // Keys are identity and array order is display order. Epic 4.1 forced
    // keys to ascend; that would stop an admin reordering options without
    // renumbering them — the one edit that corrupts answers already given.
    it('should accept options whose keys are not in ascending order', () => {
      expect(() =>
        assertQuestionShape({
          questionType: 'selection',
          options: [
            { key: 3, label: 'C' },
            { key: 1, label: 'A' },
            { key: 2, label: 'B' },
          ],
        }),
      ).not.toThrow();
    });
  });

  it.each(['slider', 'radio', 'select', 'essay'])(
    'should reject the retired or unknown type %s',
    (questionType) => {
      expect(() => assertQuestionShape({ questionType, options })).toThrow(
        code('questionType', 'unsupported'),
      );
    },
  );
});

describe('isAllowedOptionKey', () => {
  const question = {
    questionType: 'selection',
    options: [
      { key: 3, label: 'C' },
      { key: 1, label: 'A' },
    ],
  };

  it('should accept a key the question declares', () => {
    expect(isAllowedOptionKey(question, 3)).toBe(true);
  });

  // An FE sending the array index instead of the key produces a plausible
  // number that would count toward the wrong option on the dashboard.
  it('should reject an array index that is not a key', () => {
    expect(isAllowedOptionKey(question, 0)).toBe(false);
    expect(isAllowedOptionKey(question, 2)).toBe(false);
  });

  it('should reject a non-integer', () => {
    expect(isAllowedOptionKey(question, 1.5)).toBe(false);
  });

  it('should reject null and undefined', () => {
    expect(isAllowedOptionKey(question, null)).toBe(false);
    expect(isAllowedOptionKey(question, undefined)).toBe(false);
  });

  it('should reject any key on a free_text question', () => {
    expect(
      isAllowedOptionKey({ questionType: 'free_text', options: null }, 1),
    ).toBe(false);
  });
});
