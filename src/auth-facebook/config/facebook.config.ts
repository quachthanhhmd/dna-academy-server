import { registerAs } from '@nestjs/config';

import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FacebookConfig } from './facebook-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  FACEBOOK_APP_ID: string;

  @IsString()
  @IsOptional()
  FACEBOOK_APP_SECRET: string;
}

export default registerAs<FacebookConfig>('facebook', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  console.log(' process.env.FACEBOOK_APP_ID: ', process.env.FACEBOOK_APP_ID);
  return {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
  };
});
