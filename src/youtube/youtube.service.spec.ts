import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeService } from './youtube.service';
import { AllConfigType } from '../config/config.type';

const withKey = (apiKey?: string) =>
  new YoutubeService({
    get: () => apiKey,
  } as unknown as ConfigService<AllConfigType>);

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

describe('YoutubeService', () => {
  let service: YoutubeService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = withKey();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should reject a URL with no recognizable YouTube video id, without calling fetch', async () => {
    await expect(
      service.validateAndExtractVideoId('https://example.com/not-youtube'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should extract the video id from a watch?v= URL when oEmbed confirms it', async () => {
    fetchSpy.mockResolvedValue({ ok: true } as Response);

    const id = await service.validateAndExtractVideoId(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );

    expect(id).toBe('dQw4w9WgXcQ');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://www.youtube.com/oembed?url='),
      expect.any(Object),
    );
  });

  it('should extract the video id from a youtu.be short URL', async () => {
    fetchSpy.mockResolvedValue({ ok: true } as Response);

    const id = await service.validateAndExtractVideoId(
      'https://youtu.be/dQw4w9WgXcQ',
    );

    expect(id).toBe('dQw4w9WgXcQ');
  });

  it('should reject when the oEmbed API responds non-ok (video does not exist / is private)', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 404 } as Response);

    await expect(
      service.validateAndExtractVideoId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should reject when the oEmbed request times out or errors', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'));

    await expect(
      service.validateAndExtractVideoId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  describe('getDuration', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    it('should return the length YouTube reports, in seconds', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          items: [
            { id: 'dQw4w9WgXcQ', contentDetails: { duration: 'PT3M33S' } },
          ],
        }),
      );

      await expect(withKey('key').getDuration(url)).resolves.toEqual({
        videoId: 'dQw4w9WgXcQ',
        durationSecs: 213,
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('id=dQw4w9WgXcQ'),
        expect.any(Object),
      );
    });

    it('should reject a link that is not a YouTube video, without calling fetch', async () => {
      await expect(
        withKey('key').getDuration('https://vimeo.com/123'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should say notConfigured when there is no API key, without calling fetch', async () => {
      await expect(withKey().getDuration(url)).resolves.toEqual({
        videoId: 'dQw4w9WgXcQ',
        durationSecs: null,
        reason: 'notConfigured',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should say notFound for a private or deleted video', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ items: [] }));

      await expect(withKey('key').getDuration(url)).resolves.toMatchObject({
        durationSecs: null,
        reason: 'notFound',
      });
    });

    it('should say noDuration for a live stream', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          items: [{ id: 'dQw4w9WgXcQ', contentDetails: { duration: 'P0D' } }],
        }),
      );

      await expect(withKey('key').getDuration(url)).resolves.toMatchObject({
        durationSecs: null,
        reason: 'noDuration',
      });
    });

    it('should say unavailable when the API refuses the key or quota is spent', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, false, 403));

      await expect(withKey('key').getDuration(url)).resolves.toMatchObject({
        durationSecs: null,
        reason: 'unavailable',
      });
    });
  });
});
