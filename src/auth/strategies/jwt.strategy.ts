import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OrNeverType } from '../../utils/types/or-never.type';
import { JwtPayloadType } from './types/jwt-payload.type';
import { AllConfigType } from '../../config/config.type';
import { StatusEnum } from '../../statuses/statuses.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AllConfigType>,
    private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('auth.secret', { infer: true }),
    });
  }

  /**
   * The upstream boilerplate returns the payload untouched and documents why
   * it does not read the database (docs/auth.md). That reasoning assumes an
   * access token short enough that a revoked account cannot do damage before
   * it expires — but it leaves two holes this project cannot accept:
   *
   * - **Deactivated accounts keep working.** `StatusEnum.deactivated` is
   *   documented as "cannot sign in or refresh" (permission model D9), and an
   *   admin switching somebody off expects that to take effect. Without this
   *   check the holder keeps full access until the token expires, and can
   *   refresh indefinitely.
   * - **Deleted accounts keep working.** `deleted_at` is a soft delete, so
   *   the row — and every token minted for it — outlives the deletion.
   *
   * One narrow query per request, selecting two columns by primary key, on
   * the same connection `PermissionGuard` already uses for every guarded
   * route. `inactive` (registered, email unconfirmed) is deliberately allowed
   * through: the product lets people use the app before confirming.
   */
  async validate(
    payload: JwtPayloadType,
  ): Promise<OrNeverType<JwtPayloadType>> {
    if (!payload.id) {
      throw new UnauthorizedException();
    }

    const rows: { status_id: number | null; deleted_at: Date | null }[] =
      await this.dataSource.query(
        `SELECT "status_id", "deleted_at" FROM "user" WHERE "id" = $1 LIMIT 1`,
        [payload.id],
      );

    const account = rows[0];

    if (
      !account ||
      account.deleted_at !== null ||
      Number(account.status_id) === StatusEnum.deactivated
    ) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
