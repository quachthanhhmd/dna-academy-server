import { describe, expect, it } from '@jest/globals';
import { omitUndefined } from './omit-undefined';

describe('omitUndefined', () => {
  it('should drop keys whose value is undefined', () => {
    expect(omitUndefined({ a: 1, b: undefined, c: 'x' })).toEqual({
      a: 1,
      c: 'x',
    });
  });

  /**
   * The distinction the generated repositories depend on: `undefined` means
   * "the caller said nothing", `null` means "the caller said: clear this".
   */
  it('should keep an explicit null', () => {
    expect(omitUndefined({ file: null })).toEqual({ file: null });
  });

  it('should keep falsy values that are not undefined', () => {
    expect(omitUndefined({ n: 0, s: '', b: false })).toEqual({
      n: 0,
      s: '',
      b: false,
    });
  });

  it('should not mutate its argument', () => {
    const input = { a: 1, b: undefined };
    omitUndefined(input);
    expect('b' in input).toBe(true);
  });

  it('should return an empty object for an all-undefined payload', () => {
    expect(omitUndefined({ a: undefined, b: undefined })).toEqual({});
  });
});
