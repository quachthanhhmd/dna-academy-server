import { Exclude } from 'class-transformer';
import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';

export class OauthAccount {
  @Exclude({ toPlainOnly: true })
  tokenExpiresAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  refreshToken?: string | null;

  @Exclude({ toPlainOnly: true })
  accessToken?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  providerUid: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  provider: string;

  @ApiProperty({
    type: () => User,
    nullable: false,
  })
  user: User;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
