import { describe, expect, it } from '@jest/globals';
import { maskStudentName } from './mask-student-name';

/**
 * Epic 4.1 §3.2 — the public verify page shows this string. Certificate
 * numbers come from a sequence starting at 1, so anyone can walk
 * `DNA-2026-000001` upward; this helper is the only thing between that walk
 * and the customer list. Every rule below is deliberate.
 */
describe('maskStudentName', () => {
  it('should reduce the given name of a Vietnamese name to an initial', () => {
    expect(maskStudentName('Nguyễn Văn An')).toBe('Nguyễn Văn A.');
  });

  it('should keep diacritics on the tokens it preserves', () => {
    expect(maskStudentName('Trần Thị Mai')).toBe('Trần Thị M.');
  });

  it('should keep a diacritic on the masked initial itself', () => {
    expect(maskStudentName('Lê Minh Đức')).toBe('Lê Minh Đ.');
  });

  it('should mask the surname of a Western name', () => {
    expect(maskStudentName('Alex Rivera')).toBe('Alex R.');
  });

  it('should handle a four-token name', () => {
    expect(maskStudentName('Nguyễn Thị Thu Hà')).toBe('Nguyễn Thị Thu H.');
  });

  it('should mask a single-token name rather than returning it whole', () => {
    expect(maskStudentName('Alex')).toBe('A.');
  });

  it('should collapse runs of whitespace', () => {
    expect(maskStudentName('  Nguyễn   Văn   An  ')).toBe('Nguyễn Văn A.');
  });

  it('should normalise a newline or tab to a single space', () => {
    expect(maskStudentName('Alex\tRivera')).toBe('Alex R.');
  });

  it('should return an empty string for an empty name', () => {
    expect(maskStudentName('')).toBe('');
    expect(maskStudentName('   ')).toBe('');
  });

  it('should tolerate a null or undefined snapshot', () => {
    expect(maskStudentName(null)).toBe('');
    expect(maskStudentName(undefined)).toBe('');
  });

  it('should not leak the rest of the masked token', () => {
    // The whole point: nothing after the first character survives.
    expect(maskStudentName('Alex Rivera')).not.toContain('ivera');
  });

  it('should keep a hyphenated masked token to one initial', () => {
    expect(maskStudentName('Mary Jane Watson-Parker')).toBe('Mary Jane W.');
  });

  it('should be idempotent on an already-masked name', () => {
    expect(maskStudentName('Alex R.')).toBe('Alex R.');
  });
});
