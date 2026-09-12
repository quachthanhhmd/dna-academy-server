import { registerAs } from '@nestjs/config';

import { IsInt, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { LearningConfig } from './learning-config.type';

export const DEFAULT_QUIZ_PASS_THRESHOLD = 70;
export const DEFAULT_REFLECTION_MIN_WORDS = 10;

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(0)
  @Max(100)
  QUIZ_PASS_THRESHOLD_DEFAULT: number;

  @IsInt()
  @Min(1)
  REFLECTION_MIN_WORDS: number;
}

/** `env-cmd` hands through unset keys as empty strings, which are not values. */
const orDefault = (raw: string | undefined, fallback: number): string =>
  raw === undefined || raw.trim() === '' ? String(fallback) : raw;

/**
 * Epic 4 v2.1 §2.4.1. Validated here rather than at the point of use so an
 * unusable value stops the boot instead of quietly changing who passes a quiz
 * halfway through a term.
 */
export default registerAs<LearningConfig>('learning', () => {
  const candidate = {
    QUIZ_PASS_THRESHOLD_DEFAULT: orDefault(
      process.env.QUIZ_PASS_THRESHOLD_DEFAULT,
      DEFAULT_QUIZ_PASS_THRESHOLD,
    ),
    REFLECTION_MIN_WORDS: orDefault(
      process.env.REFLECTION_MIN_WORDS,
      DEFAULT_REFLECTION_MIN_WORDS,
    ),
  };

  const validated = validateConfig(candidate, EnvironmentVariablesValidator);

  return {
    quizPassThresholdDefault: validated.QUIZ_PASS_THRESHOLD_DEFAULT,
    reflectionMinWords: validated.REFLECTION_MIN_WORDS,
  };
});
