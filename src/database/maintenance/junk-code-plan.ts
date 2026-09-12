/**
 * Epic 4.2 §4.1 — BUG-04, the classification half of the master-data cleanup.
 *
 * Kept as pure functions so the rule that decides whether a row lives or dies
 * is unit-tested, rather than living inside a script nobody runs twice.
 */

export type CodeRow = {
  id: string;
  name: string;
  isActive: boolean;
};

export type CodePlan = 'delete' | 'deactivate' | 'skip';

/**
 * A generated fixture name carries a millisecond timestamp — `Kiểu cũ
 * 1788617864051`. Ten consecutive digits is the threshold: a year, a room
 * number or a version never reaches it, so `Toán 2026` and `C++ 101` are safe.
 */
const GENERATED_NAME = /\d{10,}/;

export const isGeneratedName = (name: string): boolean =>
  typeof name === 'string' && GENERATED_NAME.test(name);

/**
 * What may happen to one code.
 *
 * A referenced row is only ever deactivated. That is the platform's existing
 * "remove" semantics for master data — Epic 2 §5 deliberately ships no delete
 * endpoint — and deleting one would break whatever course, profile or
 * instructor points at it.
 */
export const planForCode = (
  code: CodeRow,
  referenceCount: number,
): CodePlan => {
  if (!isGeneratedName(code.name)) {
    return 'skip';
  }

  if (referenceCount === 0) {
    return 'delete';
  }

  return code.isActive ? 'deactivate' : 'skip';
};
