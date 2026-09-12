import { describe, expect, it } from '@jest/globals';
import { gradeLabelFor } from './grade-label';

/**
 * Epic 4.5 §1.5 — the mapping is defined once, server-side, so the client
 * cannot drift from it.
 */
describe('gradeLabelFor', () => {
  // Every boundary from the spec table, from both sides.
  it.each([
    [100, 'A+'],
    [96, 'A+'],
    [95, 'A+'],
    [94, 'A'],
    [90, 'A'],
    [89, 'B+'],
    [85, 'B+'],
    [84, 'B'],
    [80, 'B'],
    [79, 'C+'],
    [75, 'C+'],
    [74, 'C'],
    [70, 'C'],
    [69, 'D'],
    [60, 'D'],
    [59, 'F'],
    [0, 'F'],
  ])('should map %i to %s', (score, label) => {
    expect(gradeLabelFor(score)).toBe(label);
  });

  // §1.5 / D1 — no submitted attempts means no grade row at all, not 0%.
  it('should return null for a null score', () => {
    expect(gradeLabelFor(null)).toBeNull();
  });

  it('should return null for an undefined score', () => {
    expect(gradeLabelFor(undefined)).toBeNull();
  });

  it('should still grade a genuine zero', () => {
    // A student who submitted and scored 0 has a grade; it is F.
    expect(gradeLabelFor(0)).toBe('F');
  });
});
