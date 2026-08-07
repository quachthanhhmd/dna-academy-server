import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

const YOUTUBE_VIDEO_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

@Injectable()
export class YoutubeService {
  /**
   * Confirms the URL points at a real, embeddable YouTube video (via the
   * oEmbed endpoint) and returns its video id. Throws 422 otherwise.
   */
  async validateAndExtractVideoId(url: string): Promise<string> {
    const videoId = this.extractVideoId(url);

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

  private extractVideoId(url: string): string | null {
    return url.match(YOUTUBE_VIDEO_ID_PATTERN)?.[1] ?? null;
  }

  private invalidUrlException(): UnprocessableEntityException {
    return new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { youtubeUrl: 'invalidYoutubeUrl' },
    });
  }
}
