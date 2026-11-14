import {
  HttpStatus,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import {
  extractYoutubeVideoId,
  fetchYoutubeDurations,
} from './youtube-data-api';

/**
 * Why a duration could not be read, so the editor can say whether typing it
 * in is a workaround (no key, API down) or the link itself is the problem.
 */
export type YoutubeDurationUnavailableReason =
  | 'notConfigured'
  | 'notFound'
  | 'noDuration'
  | 'unavailable';

export type YoutubeDurationResult =
  | { videoId: string; durationSecs: number }
  | {
      videoId: string;
      durationSecs: null;
      reason: YoutubeDurationUnavailableReason;
    };

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  /**
   * Confirms the URL points at a real, embeddable YouTube video (via the
   * oEmbed endpoint) and returns its video id. Throws 422 otherwise.
   */
  async validateAndExtractVideoId(url: string): Promise<string> {
    const videoId = extractYoutubeVideoId(url);

    if (!videoId) {
      throw this.invalidUrlException();
    }

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw this.invalidUrlException();
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      throw this.invalidUrlException();
    }

    return videoId;
  }

  /**
   * Reads the video's length from the YouTube Data API. Never throws for a
   * duration it cannot get — the editor falls back to manual entry — only for
   * a URL that is not a YouTube link at all.
   */
  async getDuration(url: string): Promise<YoutubeDurationResult> {
    const videoId = extractYoutubeVideoId(url);

    if (!videoId) {
      throw this.invalidUrlException();
    }

    const apiKey = this.configService.get('youtube.apiKey', { infer: true });

    if (!apiKey) {
      return { videoId, durationSecs: null, reason: 'notConfigured' };
    }

    let durations: Map<string, number | null>;
    try {
      durations = await fetchYoutubeDurations([videoId], apiKey);
    } catch (error) {
      this.logger.warn(
        `Could not read the duration of ${videoId}: ${(error as Error).message}`,
      );
      return { videoId, durationSecs: null, reason: 'unavailable' };
    }

    if (!durations.has(videoId)) {
      return { videoId, durationSecs: null, reason: 'notFound' };
    }

    const durationSecs = durations.get(videoId);

    return durationSecs
      ? { videoId, durationSecs }
      : { videoId, durationSecs: null, reason: 'noDuration' };
  }

  private invalidUrlException(): UnprocessableEntityException {
    return new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { youtubeUrl: 'invalidYoutubeUrl' },
    });
  }
}
