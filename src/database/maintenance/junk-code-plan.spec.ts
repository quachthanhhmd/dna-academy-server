import { describe, expect, it } from '@jest/globals';
import { isGeneratedName, planForCode } from './junk-code-plan';

/**
 * Epic 4.2 §4.1 — BUG-04. `course_level` held 585 rows against ~4 real ones
 * because no e2e spec had an `afterAll` and the suite ran against the dev
 * database. This decides, per code, what may safely happen to it.
 */
describe('isGeneratedName', () => {
  it.each([
    'Kiểu cũ 1788617864051',
    'Group A 1788064322618',
    'E4 Instructor 1788230375265',
    'Level-1788617864051',
    '1788617864051',
  ])('should recognise %p as generated', (name) => {
    expect(isGeneratedName(name)).toBe(true);
  });

  // A real label must never match, whatever it contains.
  it.each([
    'Cơ bản',
    'Nâng cao',
    'Beginner',
    'Khoa học Dữ liệu',
    'Lớp 12',
    'Toán 2026',
    'C++ 101',
    'Khóa học 2026',
  ])('should leave %p alone', (name) => {
    expect(isGeneratedName(name)).toBe(false);
  });

  it('should need at least ten consecutive digits', () => {
    // A year, a room number or a version is not a timestamp.
    expect(isGeneratedName('Phòng 123456789')).toBe(false);
    expect(isGeneratedName('Phòng 1234567890')).toBe(true);
  });

  it('should tolerate an empty or missing name', () => {
    expect(isGeneratedName('')).toBe(false);
    expect(isGeneratedName(null as never)).toBe(false);
  });
});

describe('planForCode', () => {
  const junk = { id: 'c1', name: 'Kiểu cũ 1788617864051', isActive: true };

  it('should delete an unreferenced generated code', () => {
    expect(planForCode(junk, 0)).toBe('delete');
  });

  /**
   * A referenced code is deactivated, never deleted: that is already the
   * platform's "remove" semantics for master data (Epic 2 §5 — there is no
   * delete endpoint by design), and deleting one would break the course,
   * profile or instructor pointing at it.
   */
  it('should deactivate a generated code that something points at', () => {
    expect(planForCode(junk, 1)).toBe('deactivate');
  });

  it('should skip a generated code that is already inactive', () => {
    expect(planForCode({ ...junk, isActive: false }, 3)).toBe('skip');
  });

  it('should still delete an inactive code nothing references', () => {
    // Inactive and unreferenced is simply dead weight.
    expect(planForCode({ ...junk, isActive: false }, 0)).toBe('delete');
  });

  it('should never touch a real code, referenced or not', () => {
    const real = { id: 'c2', name: 'Cơ bản', isActive: true };

    expect(planForCode(real, 0)).toBe('skip');
    expect(planForCode(real, 12)).toBe('skip');
  });
});
