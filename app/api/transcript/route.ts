import { NextRequest, NextResponse } from "next/server";
import { clientIp, withinLimit } from "@/lib/server/rateLimit";
import { loadTranscript } from "@/lib/server/youtube";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("v") || "";
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId))
    return NextResponse.json({ error: "Invalid video." }, { status: 400 });
  if (!(await withinLimit("transcript", clientIp(req), 60, 3600)))
    return NextResponse.json(
      { error: "Too many requests. Try again in a little while." },
      { status: 429 },
    );
  try {
    const transcript = await loadTranscript(videoId);
    if (!transcript)
      return NextResponse.json(
        { error: "A timed transcript isn’t available for this lecture." },
        { status: 404 },
      );
    return NextResponse.json(transcript);
  } catch {
    return NextResponse.json(
      { error: "The transcript couldn’t be loaded. Please try again." },
      { status: 502 },
    );
  }
}
