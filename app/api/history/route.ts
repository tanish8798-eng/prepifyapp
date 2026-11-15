import { NextRequest, NextResponse } from "next/server";

import { kv } from "@/lib/server/kv";
import { getViewer } from "@/lib/server/viewer";

const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 120;
const MAX_HISTORY = 60;

export interface HistoryEntry {
  id: string;
  videoId: string;
  title: string;
  subject: string;
  date: string;
  duration: number;
  progress: number;
  quizScore: number | null;
  summary: string;
  topics: string[];
  watchedAt: number;
}

type HistoryState = {
  entries: HistoryEntry[];
  totalWatchSeconds: number;
};

function historyKey(viewerId: string) {
  return `history:${viewerId}`;
}

async function readHistory(viewerId: string): Promise<HistoryState> {
  const raw = await kv.get(historyKey(viewerId));
  if (!raw) {
    return { entries: [], totalWatchSeconds: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HistoryState>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      totalWatchSeconds:
        typeof parsed.totalWatchSeconds === "number"
          ? parsed.totalWatchSeconds
          : 0,
    };
  } catch {
    return { entries: [], totalWatchSeconds: 0 };
  }
}

async function saveHistory(viewerId: string, state: HistoryState) {
  await kv.set(historyKey(viewerId), JSON.stringify(state), HISTORY_TTL_SECONDS);
}

export async function GET(req: NextRequest) {
  const viewer = await getViewer(req);
  const state = await readHistory(viewer.id);
  return NextResponse.json({
    ...state,
    displayName: viewer.displayName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const viewer = await getViewer(req);
    const body = (await req.json()) as {
      entry?: HistoryEntry;
      watchSeconds?: number;
    };

    const state = await readHistory(viewer.id);

    if (body.entry?.videoId && /^[a-zA-Z0-9_-]{11}$/.test(body.entry.videoId)) {
      state.entries = [
        body.entry,
        ...state.entries.filter((entry) => entry.videoId !== body.entry!.videoId),
      ].slice(0, MAX_HISTORY);
    }

    if (typeof body.watchSeconds === "number" && body.watchSeconds > 0) {
      state.totalWatchSeconds += Math.min(body.watchSeconds, 60);
    }

    await saveHistory(viewer.id, state);

    return NextResponse.json({
      ok: true,
      ...state,
      displayName: viewer.displayName,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save history." }, { status: 500 });
  }
}
