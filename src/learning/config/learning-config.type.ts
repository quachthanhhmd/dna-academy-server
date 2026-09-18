export type LearningConfig = {
  /**
   * Written into `lecture_content_quiz.passThresholdPercent` when a quiz is
   * created without an explicit threshold. Existing rows are never touched.
   */
  quizPassThresholdDefault: number;
  /** Minimum words per required reflection answer on a non-draft submit. */
  reflectionMinWords: number;
  /**
   * Epic 4.6 D3 — minimum trimmed characters for a free-text career
   * reflection answer. Sent to the client too, so both sides enforce one rule.
   */
  careerReflectionMinChars: number;
};
