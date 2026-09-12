import { describe, expect, it } from '@jest/globals';
import { countWords } from './word-count';

describe('countWords', () => {
  it('should count space-separated words', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('should collapse runs of whitespace and newlines', () => {
    expect(countWords('  one \n\n two \t three  ')).toBe(3);
  });

  it('should count Vietnamese syllables as words', () => {
    // Vietnamese is written with spaces between syllables, so a whitespace
    // split is the right unit here.
    expect(countWords('Tôi đã học được rất nhiều điều')).toBe(7);
  });

  it('should not count punctuation as a word', () => {
    expect(countWords('Hello , world !')).toBe(2);
  });

  it('should return 0 for empty or nullish input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });
});
