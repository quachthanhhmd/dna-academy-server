/**
 * Epic 4.5 §1.5 — the letter beside a completed course's final grade.
 *
 * Defined once here, server-side, so the client renders a label rather than
 * re-deriving the thresholds and drifting from them.
 *
 * Ordered high to low; the first threshold a score clears wins.
 */
const GRADE_BANDS: readonly [number, string][] = [
  [95, 'A+'],
  [90, 'A'],
  [85, 'B+'],
  [80, 'B'],
  [75, 'C+'],
  [70, 'C'],
  [60, 'D'],
];

/**
 * `null` means "no grade", which is different from a grade of zero: D1 says a
 * course with no submitted attempts omits the grade row entirely rather than
 * showing `0%`. A student who submitted and scored 0 gets an `F`.
 */
export const gradeLabelFor = (
  score: number | null | undefined,
): string | null => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return null;
  }

  return GRADE_BANDS.find(([threshold]) => score >= threshold)?.[1] ?? 'F';
};
