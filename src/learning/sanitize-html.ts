const BLOCK_ELEMENTS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'form',
  'input',
  'button',
];

/**
 * Conservative allow-by-shape sanitizer for article bodies (Epic 4 v2 §5.5).
 *
 * The admin editor is the only writer and it is permission-guarded, so this is
 * defence in depth rather than the primary control: it removes executable
 * markup, inline event handlers, `javascript:` URLs and style attributes.
 * Swap in a full DOM-based sanitizer if untrusted authors ever gain access.
 */
export function sanitizeHtml(input?: string | null): string {
  if (typeof input !== 'string' || input === '') {
    return '';
  }

  let output = input;

  for (const tag of BLOCK_ELEMENTS) {
    // Paired form, including contents.
    output = output.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, 'gi'),
      '',
    );
    // Self-closing / unpaired form.
    output = output.replace(new RegExp(`<${tag}\\b[^>]*/?>`, 'gi'), '');
  }

  // Inline event handlers: onclick=, onerror=, ... quoted or bare.
  output = output.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // style= is dropped wholesale — CSS can carry behaviour in older engines.
  output = output.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // javascript:/vbscript:/data: URLs in href/src.
  output = output.replace(
    /\s(href|src)\s*=\s*("|')?\s*(javascript|vbscript|data):[^"'>\s]*("|')?/gi,
    '',
  );

  return output;
}
