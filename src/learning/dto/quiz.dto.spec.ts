import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SaveQuizDraftDto } from './quiz.dto';

/**
 * The global ValidationPipe runs with `whitelist: true`, which deletes every
 * property that carries no class-validator decorator. A DTO field documented
 * with @ApiProperty alone silently arrives as undefined, so the shape has to
 * be asserted here rather than trusted.
 */
describe('SaveQuizDraftDto', () => {
  const transform = (payload: unknown) =>
    plainToInstance(SaveQuizDraftDto, payload, {
      excludeExtraneousValues: false,
    });

  it('should keep answersJson after whitelisting', () => {
    const dto = transform({ answersJson: { q1: ['a'] } });

    expect(validateSync(dto, { whitelist: true })).toHaveLength(0);
    expect(dto.answersJson).toEqual({ q1: ['a'] });
  });

  it('should accept an empty draft', () => {
    const dto = transform({ answersJson: {} });

    expect(validateSync(dto, { whitelist: true })).toHaveLength(0);
  });

  it('should reject a non-object draft', () => {
    expect(
      validateSync(transform({ answersJson: 'nope' }), { whitelist: true }),
    ).not.toHaveLength(0);
  });
});
