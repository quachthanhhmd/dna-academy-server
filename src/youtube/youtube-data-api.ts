/**
 * Plain helpers around the YouTube Data API v3, shared by YoutubeService and
 * the duration backfill script (which runs without the Nest container).
 *
 * oEmbed — what YoutubeService uses to validate a link — has no duration;
 * `videos.list?part=contentDetails` is the only public source of it, and it
 * needs an API key. A key reads any public or unlisted video, whoever owns
 * the channel; private videos come back as if they did not exist.
 */

export const YOUTUBE_VIDEO_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/** `videos.list` accepts at most 50 ids per request. */
export const YOUTUBE_IDS_PER_REQUEST = 50;

export const extractYoutubeVideoId = (url: string): string | null =>
  url.match(YOUTUBE_VIDEO_ID_PATTERN)?.[1] ?? null;

/**
 * `PT1H24M5S` -> 5045. Returns null for anything that is not a positive
 * duration: a live stream or premiere reports `P0D`, which is no length the
 * curriculum can show.
 */
export const parseIsoDuration = (
  iso: string | null | undefined,
): number | null => {
  const match = iso?.match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );

  if (!match) {
    return null;
  }

  const [, weeks, days, hours, minutes, seconds] = match.map((part) =>
    part === undefined ? 0 : Number(part),
  );
  const total = Math.round(
    weeks * 604800 + days * 86400 + hours * 3600 + minutes * 60 + seconds,
  );

  return total > 0 ? total : null;
};

type VideosListResponse = {
  items?: { id: string; contentDetails?: { duration?: string } }[];
};

/**
 * Duration in seconds for each id YouTube knows about. Ids missing from the
 * map are private, deleted or never existed; ids mapped to null have no
 * usable length (live streams). Throws when the request itself fails — a bad
 * key, an exhausted quota or no network — so callers can tell that apart
 * from "this video has no duration".
 */
export const fetchYoutubeDurations = async (
  videoIds: string[],
  apiKey: string,
  timeoutMs = 8000,
): Promise<Map<string, number | null>> => {
  const durations = new Map<string, number | null>();
  const unique = [...new Set(videoIds)];

  for (let start = 0; start < unique.length; start += YOUTUBE_IDS_PER_REQUEST) {
    const batch = unique.slice(start, start + YOUTUBE_IDS_PER_REQUEST);
    const query = new URLSearchParams({
      part: 'contentDetails',
      id: batch.join(','),
      key: apiKey,
    });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${query.toString()}`,
      { signal: AbortSignal.timeout(timeoutMs) },
    );

    if (!response.ok) {
      throw new Error(`YouTube Data API responded ${response.status}`);
    }

    const body = (await response.json()) as VideosListResponse;

    for (const item of body.items ?? []) {
      durations.set(item.id, parseIsoDuration(item.contentDetails?.duration));
    }
  }

  return durations;
};
