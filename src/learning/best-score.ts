/**
 * Epic 4 v2.1 §2.4 — the best score across a student's submitted attempts,
 * computed on read.
 *
 * Deliberately not a stored column: a cached best score is one more thing that
 * can disagree with the attempts it summarises. Shared between the quiz start
 * payload and the read-only lecture payload (Epic 4.2 §3.1) so the two can
 * never report different numbers for the same student.
 */
export const bestScore = (
  attempts: { score?: number | null; submittedAt?: Date | null }[],
): number | null => {
  const scores = attempts
    .filter((attempt) => attempt.submittedAt)
    .map((attempt) => attempt.score)
    .filter((score): score is number => typeof score === 'number');

  return scores.length ? Math.max(...scores) : null;
};

/**
 * How many times the student has actually sat the quiz. Starting an attempt
 * writes a row before a single answer exists, so counting rows counted every
 * press of "Start" — the instructions screen read "3 attempts" beside "no
 * score yet". Only a submitted attempt is a go at the quiz.
 */
export const submittedAttemptCount = (
  attempts: { submittedAt?: Date | null }[],
): number => attempts.filter((attempt) => attempt.submittedAt).length;
