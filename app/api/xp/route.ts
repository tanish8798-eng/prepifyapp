import { NextRequest, NextResponse } from "next/server";

import { kv } from "@/lib/server/kv";
import { getViewer } from "@/lib/server/viewer";

const USER_INDEX_KEY = "prepify:users";
const USER_TTL_SECONDS = 60 * 60 * 24 * 90;

interface UserData {
  xp: number;
  streak: number;
  lastActiveDate: string;
  displayName?: string;
  completedVideos: Record<
    string,
    {
      summary: boolean;
      flashcards: boolean;
      quiz: boolean;
    }
  >;
}

const XP_POINTS: Record<string, number> = {
  summary_viewed: 5,
  flashcards_completed: 10,
  quiz_completed: 20,
  video_loaded: 2,
  perfect_quiz: 15,
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

function userKey(id: string) {
  return `user:${id}`;
}

async function getUser(id: string): Promise<UserData> {
  const raw = await kv.get(userKey(id));
  if (raw) {
    try {
      return JSON.parse(raw) as UserData;
    } catch {
      // Ignore corrupt data and reset the record.
    }
  }

  return {
    xp: 0,
    streak: 0,
    lastActiveDate: "",
    completedVideos: {},
  };
}

async function saveUser(id: string, user: UserData) {
  await kv.set(userKey(id), JSON.stringify(user), USER_TTL_SECONDS);
  await kv.sadd(USER_INDEX_KEY, id);
}

export async function GET(req: NextRequest) {
  const viewer = await getViewer(req);
  const user = await getUser(viewer.id);

  return NextResponse.json({
    xp: user.xp,
    streak: user.streak,
    lastActiveDate: user.lastActiveDate,
    completedVideos: user.completedVideos,
    displayName: user.displayName ?? viewer.displayName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const viewer = await getViewer(req);
    const { action, videoId } = (await req.json()) as {
      action?: string;
      videoId?: string;
    };

    if (!action || !XP_POINTS[action]) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (videoId && !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
    }

    const user = await getUser(viewer.id);
    user.displayName = viewer.displayName;

    const currentDay = today();
    if (user.lastActiveDate !== currentDay) {
      user.streak = user.lastActiveDate === yesterday() ? user.streak + 1 : 1;
      user.lastActiveDate = currentDay;
    }

    if (videoId) {
      user.completedVideos[videoId] ??= {
        summary: false,
        flashcards: false,
        quiz: false,
      };

      if (action === "summary_viewed") {
        user.completedVideos[videoId].summary = true;
      }

      if (action === "flashcards_completed") {
        user.completedVideos[videoId].flashcards = true;
      }

      if (action === "quiz_completed") {
        user.completedVideos[videoId].quiz = true;
      }
    }

    const pointsAwarded = XP_POINTS[action];
    user.xp += pointsAwarded;
    await saveUser(viewer.id, user);

    return NextResponse.json({
      xp: user.xp,
      streak: user.streak,
      pointsAwarded,
      displayName: user.displayName,
      videoProgress: videoId ? user.completedVideos[videoId] : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
