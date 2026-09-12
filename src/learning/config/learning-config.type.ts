export type LearningConfig = {
  /**
   * Written into `lecture_content_quiz.passThresholdPercent` when a quiz is
   * created without an explicit threshold. Existing rows are never touched.
   */
  quizPassThresholdDefault: number;
  /** Minimum words per required reflection answer on a non-draft submit. */
  reflectionMinWords: number;
};
