import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOauthAccountDto } from './dto/create-oauth-account.dto';
import { UpdateOauthAccountDto } from './dto/update-oauth-account.dto';
import { OauthAccountRepository } from './infrastructure/persistence/oauth-account.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { OauthAccount } from './domain/oauth-account';

@Injectable()
export class OauthAccountsService {
  constructor(
    private readonly userService: UsersService,

    // Dependencies here
    private readonly oauthAccountRepository: OauthAccountRepository,
  ) {}

  async create(createOauthAccountDto: CreateOauthAccountDto) {
    // Do not remove comment below.
    // <creating-property />

    const userObject = await this.userService.findById(
      createOauthAccountDto.user.id,
    );
    if (!userObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'notExists',
        },
      });
    }
    const user = userObject;

    return this.oauthAccountRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      tokenExpiresAt: createOauthAccountDto.tokenExpiresAt,

      refreshToken: createOauthAccountDto.refreshToken,

      accessToken: createOauthAccountDto.accessToken,

      providerUid: createOauthAccountDto.providerUid,

      provider: createOauthAccountDto.provider,

      user,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.oauthAccountRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: OauthAccount['id']) {
    return this.oauthAccountRepository.findById(id);
  }

  findByIds(ids: OauthAccount['id'][]) {
    return this.oauthAccountRepository.findByIds(ids);
  }

  async update(
    id: OauthAccount['id'],

    updateOauthAccountDto: UpdateOauthAccountDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let user: User | undefined = undefined;

    if (updateOauthAccountDto.user) {
      const userObject = await this.userService.findById(
        updateOauthAccountDto.user.id,
      );
      if (!userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            user: 'notExists',
          },
        });
      }
      user = userObject;
    }

    return this.oauthAccountRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      tokenExpiresAt: updateOauthAccountDto.tokenExpiresAt,

      refreshToken: updateOauthAccountDto.refreshToken,

      accessToken: updateOauthAccountDto.accessToken,

      providerUid: updateOauthAccountDto.providerUid,

      provider: updateOauthAccountDto.provider,

      user,
    });
  }

  remove(id: OauthAccount['id']) {
    return this.oauthAccountRepository.remove(id);
  }
}
