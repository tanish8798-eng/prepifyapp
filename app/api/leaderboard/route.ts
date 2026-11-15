import { NextResponse } from "next/server";

import { kv } from "@/lib/server/kv";

const USER_INDEX_KEY = "prepify:users";

interface UserData {
  xp: number;
  streak: number;
  lastActiveDate: string;
  displayName?: string;
  completedVideos: Record<string, unknown>;
}

function userKey(id: string) {
  return `user:${id}`;
}

function fallbackName(id: string) {
  return id.startsWith("guest:")
    ? `Guest ${id.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "user"}`
    : `User ${id.slice(-4)}`;
}

export async function GET() {
  const ids = await kv.smembers(USER_INDEX_KEY);

  const users = await Promise.all(
    ids.map(async (id) => {
      const raw = await kv.get(userKey(id));
      if (!raw) {
        return null;
      }

      try {
        const user = JSON.parse(raw) as UserData;
        return {
          id,
          displayName: user.displayName || fallbackName(id),
          xp: user.xp ?? 0,
          streak: user.streak ?? 0,
          videosWatched: Object.keys(user.completedVideos || {}).length,
          lastActive: user.lastActiveDate ?? "",
        };
      } catch {
        return null;
      }
    }),
  );

  const leaderboard = users
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter((entry) => entry.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50);

  return NextResponse.json({
    leaderboard,
    total: ids.length,
  });
}
