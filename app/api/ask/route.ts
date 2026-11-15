import { NextRequest, NextResponse } from "next/server";
import type { GeneratedResult } from "@/app/api/generate/route";
import { generateText } from "@/lib/server/gemini";
import { kv } from "@/lib/server/kv";
import { clientIp, withinLimit } from "@/lib/server/rateLimit";
import { formatTimestamp, loadTranscript } from "@/lib/server/youtube";

type Turn = { role: "user" | "assistant"; text: string };

const MAX_CONTEXT_CHARS = 180_000;

async function lectureContext(videoId: string) {
  const transcript = await loadTranscript(videoId).catch(() => null);
  if (transcript?.segments.length) {
    const lines = transcript.segments
      .map((segment) => `[${formatTimestamp(segment.start)}] ${segment.text}`)
      .join("\n");
    return { timed: true, text: lines.slice(0, MAX_CONTEXT_CHARS) };
  }
  const cached = await kv.get(`cache:${videoId}`);
  if (cached) {
    try {
      const result = JSON.parse(cached) as GeneratedResult;
      return {
        timed: false,
        text: [result.summary, ...result.keyPoints].join("\n\n"),
      };
    } catch {
      // Fall through to the missing-context response.
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: { videoId?: unknown; question?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const videoId = typeof body.videoId === "string" ? body.videoId : "";
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId) || !question || question.length > 600)
    return NextResponse.json(
      { error: "Ask a question up to 600 characters." },
      { status: 400 },
    );
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter(
      (turn): turn is Turn =>
        !!turn &&
        typeof turn === "object" &&
        ((turn as Turn).role === "user" || (turn as Turn).role === "assistant") &&
        typeof (turn as Turn).text === "string",
    )
    .slice(-8)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 3000) }));
  while (history.length && history[0].role !== "user") history.shift();

  if (!(await withinLimit("ask", clientIp(req), 40, 3600)))
    return NextResponse.json(
      { error: "You’ve asked a lot this hour. Take a breather and try again soon." },
      { status: 429 },
    );

  const context = await lectureContext(videoId);
  if (!context)
    return NextResponse.json(
      { error: "This lecture’s transcript isn’t available to answer from." },
      { status: 404 },
    );

  const system = `You are Prepify's study assistant for a single YouTube lecture. Help the learner understand this lecture.
Rules:
- Ground answers in the lecture content below. If the lecture doesn't cover the question, say so in one sentence, then give a brief general explanation labelled "Beyond the lecture".
${context.timed ? "- Cite the moments you rely on with transcript timestamps in square brackets, e.g. [12:34]. Only use timestamps that appear in the transcript.\n" : ""}- Use concise markdown: short paragraphs, bullet lists, **bold** key terms. Use LaTeX with $...$ for inline math and $$...$$ for display math.
- Keep answers under about 220 words unless the learner asks for more detail.
- Never invent quotes.

LECTURE ${context.timed ? "TRANSCRIPT" : "STUDY NOTES"}:
${context.text}`;

  try {
    const answer = await generateText({
      system,
      contents: [
        ...history.map((turn) => ({
          role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: [{ text: turn.text }],
        })),
        { role: "user" as const, parts: [{ text: question }] },
      ],
    });
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && /busy/i.test(error.message)
            ? error.message
            : "The answer couldn’t be prepared. Please try again.",
      },
      { status: 502 },
    );
  }
}
