import { NextRequest, NextResponse } from "next/server";

import { kv } from "@/lib/server/kv";
import { withinLimit } from "@/lib/server/rateLimit";
import { getViewer } from "@/lib/server/viewer";
import { searchLectures } from "@/lib/server/youtube";

export interface GeneratedResult {
  summary: string;
  keyPoints: string[];
  flashcards: { q: string; a: string }[];
  quizQuestions: {
    q: string;
    opts: string[];
    ans: number;
    explanation: string;
  }[];
  videoId: string;
  durationMinutes: number;
  generatedAt: number;
  cached?: boolean;
}

const log =
  process.env.NODE_ENV === "production"
    ? () => {}
    : (...args: unknown[]) => console.error("[generate]", ...args);

const inFlight = new Map<string, Promise<GeneratedResult>>();

const CACHE_TTL_SECONDS = 86400;
const FREE_DAILY_VIDEOS = 3;
const FREE_MAX_MINUTES = 180;
const IP_MAX_REQUESTS = 15;
const IP_WINDOW_SECONDS = 3600;
const SEARCH_TTL_SECONDS = 6 * 3600;

const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function getIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function extractVideoId(value: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function rateCheck(ip: string) {
  const key = `rl:${ip}`;
  const requestCount = await kv.incr(key);
  if (requestCount === 1) {
    await kv.expire(key, IP_WINDOW_SECONDS);
  }
  return requestCount <= IP_MAX_REQUESTS;
}

async function dailyCheck(viewerId: string, videoId: string) {
  const key = `daily:${viewerId}:${todayKey()}`;

  if (await kv.sismember(key, videoId)) {
    return {
      ok: true,
      used: await kv.scard(key),
      already: true,
    };
  }

  const used = await kv.scard(key);
  if (used >= FREE_DAILY_VIDEOS) {
    return {
      ok: false,
      used,
      already: false,
    };
  }

  await kv.sadd(key, videoId);
  await kv.expire(key, 93600);
  return {
    ok: true,
    used: used + 1,
    already: false,
  };
}

function parseTimedJson(events: Array<{ segs?: Array<{ utf8?: string }>; tStartMs?: number; dDurationMs?: number }>) {
  return events
    .filter((event) => event.segs)
    .map((event) =>
      (event.segs ?? []).map((segment) => segment.utf8 ?? "").join(""),
    )
    .join(" ")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseXml(xml: string) {
  return xml
    .replace(/<text[^>]*>/g, " ")
    .replace(/<\/text>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTranscript(
  videoId: string,
): Promise<{ text: string; durationMinutes: number }> {
  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const transcriptOptions = [{ lang: "en" }, { lang: "en-US" }, {}] as const;

    for (const options of transcriptOptions) {
      try {
        const items = await YoutubeTranscript.fetchTranscript(videoId, options);
        if (!items?.length) {
          continue;
        }

        const text = items
          .map((item: { text: string }) => item.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length <= 200) {
          continue;
        }

        const lastItem = items[items.length - 1] as {
          offset: number;
          duration?: number;
        };
        const durationMinutes = Math.ceil(
          ((lastItem.offset + (lastItem.duration ?? 0)) / 1000) / 60,
        );

        return { text, durationMinutes };
      } catch {
        continue;
      }
    }
  } catch {
    // The package is optional in some environments.
  }

  try {
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: YOUTUBE_HEADERS,
      cache: "no-store",
    }).then((response) => response.text());

    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const durationMinutes = durationMatch
      ? Math.ceil(parseInt(durationMatch[1], 10) / 60)
      : 0;

    const playerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;?\s*(?:var|<\/script|window)/,
    );

    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]) as {
          captions?: {
            playerCaptionsTracklistRenderer?: {
              captionTracks?: Array<{
                languageCode?: string;
                baseUrl?: string;
              }>;
            };
          };
        };

        const tracks =
          playerResponse.captions?.playerCaptionsTracklistRenderer
            ?.captionTracks ?? [];
        if (tracks.length > 0) {
          const track =
            tracks.find((item) => item.languageCode?.startsWith("en")) ??
            tracks[0];

          if (track?.baseUrl) {
            const timedData = await fetch(`${track.baseUrl}&fmt=json3`, {
              headers: YOUTUBE_HEADERS,
              cache: "no-store",
            })
              .then((response) => response.json())
              .catch(() => null);

            if (timedData?.events?.length) {
              const text = parseTimedJson(timedData.events);
              if (text.length > 200) {
                return { text, durationMinutes };
              }
            }

            const xml = await fetch(track.baseUrl, {
              headers: YOUTUBE_HEADERS,
              cache: "no-store",
            })
              .then((response) => response.text())
              .catch(() => "");

            if (xml.length > 100) {
              const text = parseXml(xml);
              if (text.length > 200) {
                return { text, durationMinutes };
              }
            }
          }
        }
      } catch {
        // Continue to the next fallback path.
      }
    }

    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    if (!apiKey) {
      throw new Error("Unable to extract API key from YouTube page.");
    }
    const visitorData = html.match(/"visitorData":"([^"]+)"/)?.[1] ?? "";
    const clientVersion =
      html.match(/"clientVersion":"([^"]+)"/)?.[1] ?? "2.20240101.00.00";

    const transcriptResponse = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          ...YOUTUBE_HEADERS,
          "Content-Type": "application/json",
          "X-Goog-Visitor-Id": visitorData,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion,
              visitorData,
              hl: "en",
              gl: "US",
            },
          },
          params: Buffer.from(`\n\x0b${videoId}`).toString("base64"),
        }),
      },
    );

    if (transcriptResponse.ok) {
      const transcriptPayload = (await transcriptResponse.json()) as {
        actions?: Array<{
          updateEngagementPanelAction?: {
            content?: {
              transcriptRenderer?: {
                content?: {
                  transcriptSearchPanelRenderer?: {
                    body?: {
                      transcriptSegmentListRenderer?: {
                        initialSegments?: Array<{
                          transcriptSegmentRenderer?: {
                            snippet?: {
                              runs?: Array<{ text: string }>;
                            };
                          };
                        }>;
                      };
                    };
                  };
                };
              };
            };
          };
        }>;
      };

      const segments =
        transcriptPayload.actions?.[0]?.updateEngagementPanelAction?.content
          ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
          ?.transcriptSegmentListRenderer?.initialSegments ?? [];

      if (segments.length > 0) {
        const text = segments
          .map((segment) =>
            segment.transcriptSegmentRenderer?.snippet?.runs
              ?.map((run) => run.text)
              .join("") ?? "",
          )
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 200) {
          return { text, durationMinutes };
        }
      }
    }

    if (durationMinutes > 0) {
      throw Object.assign(
        new Error(
          "No captions for this video. Try a video with CC subtitles enabled.",
        ),
        {
          transcriptError: true,
          durationMinutes,
        },
      );
    }
  } catch (error) {
    if ((error as { transcriptError?: boolean }).transcriptError) {
      throw error;
    }
  }

  const languages = ["en", "en-US", "a.en", "en-IN", "en-GB"];
  const formats = ["json3", "srv3", "vtt"];

  for (const language of languages) {
    for (const format of formats) {
      try {
        const response = await fetch(
          `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${language}&fmt=${format}`,
          {
            headers: YOUTUBE_HEADERS,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          continue;
        }

        const text =
          format === "json3"
            ? parseTimedJson(
                (
                  (await response.json().catch(() => ({ events: [] }))) as {
                    events?: Array<{
                      segs?: Array<{ utf8?: string }>;
                    }>;
                  }
                ).events ?? [],
              )
            : (await response.text())
                .replace(/<[^>]+>/g, " ")
                .replace(/\d{2}:\d{2}:\d{2}[^\n]*/g, "")
                .replace(/WEBVTT.*/g, "")
                .replace(/\s+/g, " ")
                .trim();

        if (text.length > 200) {
          return { text, durationMinutes: 0 };
        }
      } catch {
        continue;
      }
    }
  }

  throw Object.assign(
    new Error(
      "Transcript not available. This video may not have captions. Try a video with the CC icon, or a different lecture on the same topic.",
    ),
    { transcriptError: true },
  );
}

function getTranscriptLimit(durationMinutes: number) {
  if (durationMinutes <= 0) return 20000;
  if (durationMinutes <= 5) return 6000;
  if (durationMinutes <= 15) return 15000;
  if (durationMinutes <= 30) return 28000;
  if (durationMinutes <= 60) return 45000;
  return 60000;
}

function getOutputTokens(durationMinutes: number) {
  if (durationMinutes <= 5) return 2048;
  if (durationMinutes <= 15) return 4096;
  if (durationMinutes <= 30) return 6144;
  return 8192;
}

function processTranscript(raw: string, durationMinutes = 0) {
  return raw
    .replace(/\[.*?\]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, getTranscriptLimit(durationMinutes));
}

function stripJsonFences(raw: string) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw.trim();
}

function repairJsonStrings(raw: string) {
  let output = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (!inString) {
      output += char;
      if (char === '"') {
        inString = true;
      }
      continue;
    }

    if (escaping) {
      const unicodeCandidate = raw.slice(index + 1, index + 5);
      const isValidEscape =
        /["\\/bfnrt]/.test(char) ||
        (char === "u" && /^[0-9a-fA-F]{4}$/.test(unicodeCandidate));

      output += isValidEscape ? char : `\\${char}`;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      escaping = true;
      continue;
    }

    if (char === "\n") {
      output += "\\n";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\t") {
      output += "\\t";
      continue;
    }

    if (char === '"') {
      let lookahead = index + 1;
      while (lookahead < raw.length && /\s/.test(raw[lookahead])) {
        lookahead += 1;
      }

      const nextToken = raw[lookahead];
      if (
        nextToken === "," ||
        nextToken === "}" ||
        nextToken === "]" ||
        nextToken === ":" ||
        lookahead >= raw.length
      ) {
        inString = false;
        output += char;
      } else {
        output += '\\"';
      }
      continue;
    }

    output += char;
  }

  if (escaping) {
    output += "\\";
  }

  return output;
}

function parseAiJson(raw: string) {
  const cleaned = extractJsonObject(stripJsonFences(raw));

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to repair attempts.
  }

  const escapedBackslashes = cleaned.replace(
    /\\(?!["\\/bfnrtu])/g,
    "\\\\",
  );
  try {
    return JSON.parse(escapedBackslashes);
  } catch {
    // Fall through to character-by-character repair.
  }

  const repaired = repairJsonStrings(escapedBackslashes);
  return JSON.parse(repaired);
}

async function callGemini(
  transcript: string,
  durationMinutes = 0,
): Promise<GeneratedResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set in .env.local");
  }

  const lengthGuide =
    durationMinutes <= 5
      ? "SHORT (<=5 min): 2-3 paragraph summary, 5 flashcards, 4 quiz questions."
      : durationMinutes <= 15
        ? "MEDIUM (5-15 min): 4-6 paragraph summary, 8 flashcards, 5 quiz questions."
        : durationMinutes <= 30
          ? "LONG (15-30 min): 7-10 paragraph summary, 10 flashcards, 6 quiz questions."
          : "VERY LONG (30+ min): 10-15+ paragraph summary, 12 flashcards, 6 quiz questions. Do not truncate.";

  const prompt = `You are an expert educational content creator for Prepify.
Return ONLY valid JSON. No markdown fences. No text before or after the JSON object.

CRITICAL JSON RULE:
- Every backslash inside JSON string values must be double-escaped.
- If you output LaTeX, write \\\\frac, \\\\int, \\\\alpha, \\\\sqrt, etc.
- Never output a single backslash inside a JSON string.

VIDEO DURATION: ${durationMinutes} minutes - ${lengthGuide}
Be thorough and concise where needed.

SUMMARY RULES:
- Use markdown headings with ### section titles.
- Use **bold** for key terms.
- Use markdown tables when useful.
- Use numbered derivation steps where appropriate.
- Use --- between major sections.
- All math must be LaTeX with double-escaped backslashes.
- Inline math example: $\\\\frac{dq}{dt}$
- Display math example: $$\\\\int_0^\\\\infty e^{-x^2} dx = \\\\frac{\\\\sqrt{\\\\pi}}{2}$$

TRANSCRIPT:
${transcript}

JSON SHAPE:
{
  "summary": "### Title\\n\\nText with $\\\\frac{dq}{dt}$\\n\\n$$\\\\int_0^1 x^2 dx$$\\n\\n---\\n\\n### Next",
  "keyPoints": ["8 specific points"],
  "flashcards": [
    { "q": "Question with $\\\\alpha$?", "a": "Answer with $\\\\beta$." }
  ],
  "quizQuestions": [
    {
      "q": "Question text",
      "opts": ["Option A", "Option B", "Option C", "Option D"],
      "ans": 0,
      "explanation": "Short explanation"
    }
  ]
}`;

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

  for (let attempt = 0; attempt < models.length; attempt += 1) {
    const model = models[attempt];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: getOutputTokens(durationMinutes),
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (response.status === 404) {
        continue;
      }

      if (response.status === 429) {
        if (attempt < models.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }

        throw new Error("AI service busy. Please try again.");
      }

      if (!response.ok) {
        throw new Error(`AI error (${response.status}).`);
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const raw =
        payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!raw) {
        throw new Error("Empty AI response.");
      }

      const parsed = parseAiJson(raw) as Partial<GeneratedResult>;
      if (
        typeof parsed.summary !== "string" ||
        !Array.isArray(parsed.keyPoints) ||
        !Array.isArray(parsed.flashcards) ||
        !Array.isArray(parsed.quizQuestions)
      ) {
        throw new Error("Bad AI response format.");
      }

      return parsed as GeneratedResult;
    } catch (error) {
      log("Attempt", attempt + 1, "failed:", (error as Error).message);
      if (attempt === models.length - 1) {
        throw error;
      }
    }
  }

  throw new Error("All models failed.");
}

export async function POST(req: NextRequest) {
  try {
    let body: { videoId?: string; url?: string; isPremium?: boolean };

    try {
      body = (await req.json()) as {
        videoId?: string;
        url?: string;
        isPremium?: boolean;
      };
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const rawInput = (body.videoId || body.url || "").toString().trim();
    if (!rawInput || rawInput.length > 300) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      return NextResponse.json(
        { error: "No valid YouTube video ID found." },
        { status: 400 },
      );
    }

    const ip = getIp(req);
    const viewer = await getViewer(req);
    const dailyLimitId = viewer.id;
    if (!(await rateCheck(ip))) {
      return NextResponse.json(
        { error: "Too many requests. Wait an hour." },
        { status: 429 },
      );
    }

    const cacheKey = `cache:${videoId}`;
    const cachedRaw = await kv.get(cacheKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as GeneratedResult;
        await dailyCheck(dailyLimitId, videoId);

        return NextResponse.json({
          ...cached,
          cached: true,
          usedToday: await kv.scard(`daily:${dailyLimitId}:${todayKey()}`),
        });
      } catch {
        // Ignore corrupt cache entries and regenerate.
      }
    }

    const daily = await dailyCheck(dailyLimitId, videoId);
    if (!daily.ok) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${FREE_DAILY_VIDEOS}/day). Come back tomorrow!`,
          dailyLimit: true,
          used: daily.used,
          limit: FREE_DAILY_VIDEOS,
        },
        { status: 429 },
      );
    }

    if (inFlight.has(videoId)) {
      try {
        return NextResponse.json({
          ...(await inFlight.get(videoId)!),
          cached: true,
        });
      } catch {
        // If the shared promise failed we fall through and retry.
      }
    }

    const generationPromise = (async () => {
      let transcriptText = "";
      let durationMinutes = 0;

      try {
        const transcript = await fetchTranscript(videoId);
        transcriptText = transcript.text;
        durationMinutes = transcript.durationMinutes;
      } catch (error) {
        const transcriptError = error as {
          message?: string;
          durationMinutes?: number;
        };

        throw Object.assign(
          new Error(transcriptError.message || "Transcript unavailable."),
          {
            transcriptError: true,
            durationMinutes: transcriptError.durationMinutes || 0,
          },
        );
      }

      if (
        !body.isPremium &&
        durationMinutes > FREE_MAX_MINUTES &&
        durationMinutes > 0
      ) {
        throw Object.assign(
          new Error(
            `Video is ${durationMinutes} min - over the ${FREE_MAX_MINUTES} min free limit.`,
          ),
          {
            durationError: true,
            durationMinutes,
            requiresPremium: true,
          },
        );
      }

      const aiResult = await callGemini(
        processTranscript(transcriptText, durationMinutes),
        durationMinutes,
      );

      const finalResult: GeneratedResult = {
        ...aiResult,
        videoId,
        durationMinutes,
        generatedAt: Date.now(),
      };

      await kv.set(cacheKey, JSON.stringify(finalResult), CACHE_TTL_SECONDS);
      return finalResult;
    })();

    inFlight.set(videoId, generationPromise);

    try {
      const result = await generationPromise;
      return NextResponse.json({
        ...result,
        cached: false,
        usedToday: await kv.scard(`daily:${dailyLimitId}:${todayKey()}`),
      });
    } finally {
      inFlight.delete(videoId);
    }
  } catch (error) {
    const handledError = error as {
      message?: string;
      transcriptError?: boolean;
      durationError?: boolean;
      requiresPremium?: boolean;
      durationMinutes?: number;
    };

    log(handledError.message?.slice(0, 300));

    return NextResponse.json(
      {
        error: handledError.message || "Something went wrong.",
        transcriptError: Boolean(handledError.transcriptError),
        durationError: Boolean(handledError.durationError),
        requiresPremium: Boolean(handledError.requiresPremium),
        durationMinutes: handledError.durationMinutes || 0,
      },
      {
        status:
          handledError.transcriptError || handledError.durationError
            ? 422
            : 500,
      },
    );
  }
}

export async function GET(req: NextRequest) {
  const viewer = await getViewer(req);

  if (req.nextUrl.searchParams.get("status")) {
    return NextResponse.json({
      usedToday: await kv.scard(`daily:${viewer.id}:${todayKey()}`),
      limit: FREE_DAILY_VIDEOS,
    });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2 || query.length > 150) {
    return NextResponse.json({ items: [] });
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeApiKey) {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
    const searchKey = `search:${normalized}`;
    const cachedSearch = await kv.get(searchKey);
    if (cachedSearch) {
      try {
        return NextResponse.json({ items: JSON.parse(cachedSearch) });
      } catch {
        // Ignore corrupt cache entries and search again.
      }
    }
    if (!(await withinLimit("search", getIp(req), 60, 3600))) {
      return NextResponse.json(
        { items: [], error: "Too many searches. Try again in a little while." },
        { status: 429 },
      );
    }
    try {
      const items = await searchLectures(normalized);
      if (items.length) {
        await kv.set(searchKey, JSON.stringify(items), SEARCH_TTL_SECONDS);
      }
      return NextResponse.json({ items });
    } catch (error) {
      log("Search failed:", (error as Error).message);
      return NextResponse.json({ items: [], error: "Search couldn’t connect." });
    }
  }

  try {
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=8&videoCaption=closedCaption&key=${youtubeApiKey}`,
      {
        next: { revalidate: 300 },
      },
    ).then((response) => response.json());

    return NextResponse.json({
      items: (searchResponse.items || []).map(
        (item: {
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails?: { medium?: { url?: string } };
          };
        }) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url,
        }),
      ),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
