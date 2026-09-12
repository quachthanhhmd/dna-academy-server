/**
 * Epic 4.1 §3.2 — masks the student name for the public verification page.
 *
 * Every token but the last is kept in full; the last is reduced to its first
 * character plus a period. For a Vietnamese name that hides the given name —
 * the part a person is actually addressed by — while leaving enough for
 * someone who already holds the certificate to recognise it, which is the only
 * legitimate use of the page.
 *
 * This matters more than its size suggests: certificate numbers come from a
 * sequence starting at 1, so `DNA-2026-000001` upward enumerates every
 * certificate ever issued. Full names here would hand over the customer list.
 */
export const maskStudentName = (name: string | null | undefined): string => {
  const tokens = (name ?? '').trim().split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return '';
  }

  const last = tokens[tokens.length - 1];
  // `[...last]` and not `last[0]`: a surrogate pair would otherwise be cut in
  // half and emitted as a lone half-character.
  const initial = [...last][0];

  return [...tokens.slice(0, -1), `${initial}.`].join(' ');
};
