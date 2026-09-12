import { describe, expect, it } from '@jest/globals';
import { sanitizeHtml } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('should keep ordinary formatting markup', () => {
    const html = '<p>Hello <strong>world</strong></p><ul><li>One</li></ul>';

    expect(sanitizeHtml(html)).toBe(html);
  });

  it('should strip script tags and their contents', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe(
      '<p>ok</p>',
    );
  });

  it('should strip inline event handlers', () => {
    expect(sanitizeHtml('<p onclick="steal()">hi</p>')).toBe('<p>hi</p>');
  });

  it('should strip javascript: URLs but keep safe hrefs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a>x</a>',
    );
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toBe(
      '<a href="https://example.com">x</a>',
    );
  });

  it('should strip iframes and object embeds', () => {
    expect(sanitizeHtml('<iframe src="https://evil"></iframe><p>a</p>')).toBe(
      '<p>a</p>',
    );
  });

  it('should strip style attributes carrying expressions', () => {
    expect(sanitizeHtml('<p style="width:expression(alert(1))">a</p>')).toBe(
      '<p>a</p>',
    );
  });

  it('should handle empty and nullish input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});
