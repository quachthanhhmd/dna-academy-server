import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { SUPPORTED_LOCALES, normalizeLocale } from './locale';

const MAX_TRANSLATION_LENGTH = 1000;

/**
 * Validates a `{ "<locale>": "<value>" }` translation map (Epic 6 §2.2.5).
 * Unknown locale keys are rejected at write time so the JSONB column can never
 * accumulate locales the platform does not serve.
 */
export function IsTranslationMap(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isTranslationMap',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) {
            return true;
          }

          if (
            typeof value !== 'object' ||
            Array.isArray(value) ||
            value instanceof Date
          ) {
            return false;
          }

          return Object.entries(value as Record<string, unknown>).every(
            ([locale, item]) =>
              normalizeLocale(locale) !== undefined &&
              typeof item === 'string' &&
              item.length <= MAX_TRANSLATION_LENGTH,
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return (
            `${args.property}: unsupportedLocaleKey — expected an object mapping ` +
            `supported locales (${SUPPORTED_LOCALES.join(', ')}) to strings of at ` +
            `most ${MAX_TRANSLATION_LENGTH} characters`
          );
        },
      },
    });
  };
}
