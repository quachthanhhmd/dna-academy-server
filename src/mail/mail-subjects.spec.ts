import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the inbox line, which is the one piece of an email a person judges
 * before deciding whether to open it. The subjects used to be the button
 * labels ("Confirm email") because a single i18n value fed both, and two
 * different emails shared one value — indistinguishable in a mailbox.
 */
const LOCALES = ['vi', 'en'];
const MAIL_NAMESPACES = [
  'confirm-email',
  'reset-password',
  'instructor-invite',
  'confirm-new-email',
];

const read = (locale: string, namespace: string) =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'i18n', locale, `${namespace}.json`),
      'utf-8',
    ),
  ) as Record<string, string>;

describe.each(LOCALES)('mail subjects (%s)', (locale) => {
  it.each(MAIL_NAMESPACES)(
    'should give %s both a subject and an action',
    (ns) => {
      const copy = read(locale, ns);

      expect(typeof copy.subject).toBe('string');
      expect(copy.subject.trim().length).toBeGreaterThan(0);
      expect(typeof copy.action).toBe('string');
      expect(copy.action.trim().length).toBeGreaterThan(0);
    },
  );

  it('should give every email a distinct subject', () => {
    // confirm-email and confirm-new-email both read "Confirm email" before
    // this change, so a learner changing their address saw the same inbox
    // line as somebody signing up.
    const subjects = MAIL_NAMESPACES.map((ns) => read(locale, ns).subject);

    expect(new Set(subjects).size).toBe(subjects.length);
  });

  it.each(MAIL_NAMESPACES)(
    'should not reuse the button label as the %s subject',
    (ns) => {
      const copy = read(locale, ns);

      expect(copy.subject.toLowerCase()).not.toBe(copy.action.toLowerCase());
    },
  );

  it.each(MAIL_NAMESPACES)(
    'should keep the %s subject inside a phone preview',
    (ns) => {
      // Mail apps truncate around 40-50 characters on a narrow screen. The
      // brand placeholder stands in for ~11 real characters.
      const rendered = read(locale, ns).subject.replace(
        '{appName}',
        'DNA Academy',
      );

      expect(rendered.length).toBeLessThanOrEqual(50);
    },
  );

  it.each(MAIL_NAMESPACES)(
    'should keep the %s subject free of spam-filter patterns',
    (ns) => {
      const subject = read(locale, ns).subject;

      expect(subject).not.toMatch(/!/);
      // No shouting: an all-caps word of 4+ letters reads as spam.
      expect(subject).not.toMatch(/\b[A-Z]{4,}\b/);
    },
  );

  it('should name the brand in the security-sensitive subjects', () => {
    // Password reset and account activation are the two the user must be able
    // to attribute to a service at a glance — they are the usual phishing
    // lures, and the brand in the subject is what makes a forgery obvious.
    for (const ns of ['reset-password', 'instructor-invite']) {
      expect(read(locale, ns).subject).toContain('{appName}');
    }
  });
});

describe('mail subject placeholders', () => {
  it('should only use placeholders the service actually supplies', () => {
    // MailService.mailCopy passes exactly one arg. An unknown placeholder
    // would reach the inbox as literal "{whatever}".
    for (const locale of LOCALES) {
      for (const ns of MAIL_NAMESPACES) {
        const found = read(locale, ns).subject.match(/\{(\w+)\}/g) ?? [];
        expect(found.every((token) => token === '{appName}')).toBe(true);
      }
    }
  });
});
