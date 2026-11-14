import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class YoutubeDurationQueryDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}

export class YoutubeDurationResponseDto {
  @ApiProperty({ example: 'dQw4w9WgXcQ' })
  videoId: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 213,
    description: 'Length in seconds; null when it could not be read.',
  })
  durationSecs: number | null;

  @ApiProperty({
    required: false,
    enum: ['notConfigured', 'notFound', 'noDuration', 'unavailable'],
    description:
      'Only when durationSecs is null. notConfigured: no YOUTUBE_API_KEY; ' +
      'notFound: private, deleted or unknown video; noDuration: live stream ' +
      'or premiere; unavailable: the YouTube API request failed.',
  })
  reason?: string;
}
