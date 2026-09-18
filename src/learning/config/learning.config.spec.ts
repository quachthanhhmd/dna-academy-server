import { describe, expect, it, afterEach } from '@jest/globals';
import learningConfig from './learning.config';

/**
 * Epic 4 v2.1 §2.4.1 — both keys must fail fast at boot rather than silently
 * defaulting, because a bad threshold changes who passes a quiz.
 */
describe('learningConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  const load = () => (learningConfig as unknown as () => unknown)();

  it('should default the pass threshold to 70', () => {
    delete process.env.QUIZ_PASS_THRESHOLD_DEFAULT;

    expect(load()).toMatchObject({ quizPassThresholdDefault: 70 });
  });

  it('should default the reflection minimum to 10 words', () => {
    delete process.env.REFLECTION_MIN_WORDS;

    expect(load()).toMatchObject({ reflectionMinWords: 10 });
  });

  it('should read both keys from the environment', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '85';
    process.env.REFLECTION_MIN_WORDS = '50';

    expect(load()).toMatchObject({
      quizPassThresholdDefault: 85,
      reflectionMinWords: 50,
    });
  });

  it('should accept the boundary values 0 and 100 for the threshold', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '0';
    expect(load()).toMatchObject({ quizPassThresholdDefault: 0 });

    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '100';
    expect(load()).toMatchObject({ quizPassThresholdDefault: 100 });
  });

  it('should reject a threshold above 100', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '101';

    expect(load).toThrow();
  });

  it('should reject a negative threshold', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '-1';

    expect(load).toThrow();
  });

  it('should reject a non-numeric threshold', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = 'seventy';

    expect(load).toThrow();
  });

  it('should reject a fractional threshold', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '70.5';

    expect(load).toThrow();
  });

  it('should reject a reflection minimum below 1', () => {
    process.env.REFLECTION_MIN_WORDS = '0';

    expect(load).toThrow();
  });

  it('should reject a non-numeric reflection minimum', () => {
    process.env.REFLECTION_MIN_WORDS = 'ten';

    expect(load).toThrow();
  });

  it('should treat an empty string as absent', () => {
    process.env.QUIZ_PASS_THRESHOLD_DEFAULT = '';
    process.env.REFLECTION_MIN_WORDS = '';

    expect(load()).toMatchObject({
      quizPassThresholdDefault: 70,
      reflectionMinWords: 10,
    });
  });
  describe('CAREER_REFLECTION_MIN_CHARS (Epic 4.6 D3)', () => {
    it('should default to 10 characters', () => {
      delete process.env.CAREER_REFLECTION_MIN_CHARS;

      expect(load()).toMatchObject({ careerReflectionMinChars: 10 });
    });

    it('should read the value from the environment', () => {
      process.env.CAREER_REFLECTION_MIN_CHARS = '25';

      expect(load()).toMatchObject({ careerReflectionMinChars: 25 });
    });

    it('should treat an empty string as absent', () => {
      process.env.CAREER_REFLECTION_MIN_CHARS = '';

      expect(load()).toMatchObject({ careerReflectionMinChars: 10 });
    });

    it('should reject zero, which would accept a blank answer', () => {
      process.env.CAREER_REFLECTION_MIN_CHARS = '0';

      expect(load).toThrow();
    });

    it('should reject a value no answer could ever reach', () => {
      process.env.CAREER_REFLECTION_MIN_CHARS = '6000';

      expect(load).toThrow();
    });

    it('should reject a non-numeric value', () => {
      process.env.CAREER_REFLECTION_MIN_CHARS = 'ten';

      expect(load).toThrow();
    });
  });
});
