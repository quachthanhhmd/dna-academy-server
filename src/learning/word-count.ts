/**
 * Word count used to validate reflection answers server-side.
 *
 * Vietnamese writes a space between every syllable, so a whitespace split is
 * the correct unit for both supported locales. Tokens made purely of
 * punctuation do not count.
 */
export function countWords(text?: string | null): number {
  if (typeof text !== 'string') {
    return 0;
  }

  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token))
    .length;
}
