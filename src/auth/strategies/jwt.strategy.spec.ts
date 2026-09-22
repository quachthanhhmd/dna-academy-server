import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { StatusEnum } from '../../statuses/statuses.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy.validate', () => {
  let dataSource: { query: jest.Mock<any> };
  let strategy: JwtStrategy;

  const configService = {
    getOrThrow: () => 'a-signing-key-long-enough-for-the-constructor',
  };

  const payload = { id: 42, role: { id: 1 }, sessionId: 7 } as any;

  const account = (over: Record<string, unknown> = {}) => [
    { status_id: StatusEnum.active, deleted_at: null, ...over },
  ];

  beforeEach(() => {
    dataSource = { query: jest.fn() as jest.Mock<any> };
    strategy = new JwtStrategy(configService as any, dataSource as any);
  });

  it('should accept an active account and return the payload unchanged', async () => {
    dataSource.query.mockResolvedValue(account());

    await expect(strategy.validate(payload)).resolves.toBe(payload);
  });

  it('should accept an unconfirmed account', async () => {
    // `inactive` is registration waiting on an email confirmation — the
    // product lets those users in, so this must not be treated as revoked.
    dataSource.query.mockResolvedValue(
      account({ status_id: StatusEnum.inactive }),
    );

    await expect(strategy.validate(payload)).resolves.toBe(payload);
  });

  it('should reject a deactivated account (D9)', async () => {
    dataSource.query.mockResolvedValue(
      account({ status_id: StatusEnum.deactivated }),
    );

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a soft-deleted account', async () => {
    dataSource.query.mockResolvedValue(
      account({ deleted_at: new Date('2026-01-01') }),
    );

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a token whose user row is gone', async () => {
    dataSource.query.mockResolvedValue([]);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should reject a payload with no id without querying', async () => {
    await expect(strategy.validate({} as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('should look the account up by primary key, selecting only what it needs', async () => {
    dataSource.query.mockResolvedValue(account());

    await strategy.validate(payload);

    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toContain('FROM "user"');
    expect(sql).toContain('LIMIT 1');
    // No SELECT *: this runs on every authenticated request.
    expect(sql).not.toContain('*');
    expect(params).toEqual([42]);
  });

  it('should treat a string status_id as its number (pg driver variance)', async () => {
    dataSource.query.mockResolvedValue(
      account({ status_id: String(StatusEnum.deactivated) }),
    );

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
