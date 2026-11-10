import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SubmitLessonRatingDto } from './lesson-rating.dto';

const errorsFor = (body: unknown) =>
  validateSync(plainToInstance(SubmitLessonRatingDto, body)).map(
    (error) => error.property,
  );

describe('SubmitLessonRatingDto', () => {
  it.each([1, 3, 5])('should accept a rating of %i', (rating) => {
    expect(errorsFor({ rating })).toEqual([]);
  });

  it.each([0, 6, 2.5, '4', null])('should refuse a rating of %p', (rating) => {
    expect(errorsFor({ rating })).toContain('rating');
  });

  it('should refuse a comment over 2000 characters', () => {
    expect(errorsFor({ rating: 4, comment: 'x'.repeat(2001) })).toContain(
      'comment',
    );
  });
});
