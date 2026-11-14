import { registerAs } from '@nestjs/config';

import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { YoutubeConfig } from './youtube-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  YOUTUBE_API_KEY: string;
}

export default registerAs<YoutubeConfig>('youtube', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    apiKey: process.env.YOUTUBE_API_KEY || undefined,
  };
});
