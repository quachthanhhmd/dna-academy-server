import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

describe('YoutubeService', () => {
  let service: YoutubeService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new YoutubeService();
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
});
