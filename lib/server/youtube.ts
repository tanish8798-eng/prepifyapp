import { kv } from "@/lib/server/kv";

export type LectureResult = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  minutes: number;
  views?: string;
};

export type TranscriptSegment = { start: number; text: string };

const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const MAX_LECTURE_MINUTES = 180;

function lengthToSeconds(length: string) {
  return length
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
}

type Runs = { runs?: { text?: string }[]; simpleText?: string };
type VideoRenderer = {
  videoId?: string;
  title?: Runs;
  ownerText?: Runs;
  lengthText?: Runs;
  shortViewCountText?: Runs;
};

function runsText(value?: Runs) {
  return (
    value?.simpleText ?? value?.runs?.map((run) => run.text ?? "").join("") ?? ""
  ).trim();
}

export async function searchLectures(query: string): Promise<LectureResult[]> {
  const response = await fetch(
    "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
    {
      method: "POST",
      headers: { ...YOUTUBE_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20241101.00.00",
            hl: "en",
            gl: "US",
          },
        },
        query,
        // Restricts results to videos with subtitles/CC, which Prepify needs.
        params: "EgIoAQ==",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error(`YouTube search failed (${response.status})`);

  const renderers: VideoRenderer[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.videoRenderer) {
      renderers.push(record.videoRenderer as VideoRenderer);
      return;
    }
    for (const value of Object.values(record)) walk(value);
  };
  walk(await response.json());

  const seen = new Set<string>();
  const lectures: LectureResult[] = [];
  for (const video of renderers) {
    const videoId = video.videoId;
    const duration = runsText(video.lengthText);
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId) || !duration) continue;
    if (seen.has(videoId)) continue;
    const seconds = lengthToSeconds(duration);
    if (seconds < 60 || seconds > MAX_LECTURE_MINUTES * 60) continue;
    seen.add(videoId);
    lectures.push({
      videoId,
      title: runsText(video.title) || "YouTube lecture",
      channel: runsText(video.ownerText),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      duration,
      minutes: Math.ceil(seconds / 60),
      views: runsText(video.shortViewCountText) || undefined,
    });
    if (lectures.length >= 12) break;
  }
  return lectures;
}

function decodeEntities(value: string) {
  let text = value;
  for (let pass = 0; pass < 2; pass++)
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return text;
}

export async function fetchTimedTranscript(videoId: string) {
  const { YoutubeTranscript } = await import("youtube-transcript");
  for (const options of [{ lang: "en" }, { lang: "en-US" }, {}]) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, options);
      if (!items?.length) continue;
      // srv3 captions report integer milliseconds; legacy captions report fractional seconds.
      const milliseconds = items.every(
        (item) =>
          Number.isInteger(item.offset) && Number.isInteger(item.duration),
      );
      const scale = milliseconds ? 1000 : 1;
      const segments: TranscriptSegment[] = [];
      let current: TranscriptSegment | null = null;
      for (const item of items) {
        const text = decodeEntities(item.text)
          .replace(/\[[^\]]*\]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (!text) continue;
        const start = item.offset / scale;
        if (
          current &&
          (start - current.start < 18 || current.text.length < 90) &&
          current.text.length < 260
        ) {
          current.text += ` ${text}`;
        } else {
          current = { start: Math.floor(start), text };
          segments.push(current);
        }
      }
      if (!segments.length) continue;
      const last = items[items.length - 1];
      return {
        segments,
        durationSeconds: Math.ceil((last.offset + (last.duration || 0)) / scale),
      };
    } catch {
      continue;
    }
  }
  return null;
}

export function formatTimestamp(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

export type TranscriptPayload = {
  segments: TranscriptSegment[];
  durationSeconds: number;
};

const TRANSCRIPT_TTL_SECONDS = 86400;

export async function loadTranscript(
  videoId: string,
): Promise<TranscriptPayload | null> {
  const cacheKey = `transcript:${videoId}`;
  const cached = await kv.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as TranscriptPayload;
    } catch {
      // Fetch again when the cache entry is unreadable.
    }
  }
  const transcript = await fetchTimedTranscript(videoId);
  if (transcript)
    await kv.set(cacheKey, JSON.stringify(transcript), TRANSCRIPT_TTL_SECONDS);
  return transcript;
}
