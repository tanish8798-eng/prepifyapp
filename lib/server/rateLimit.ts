import type { NextRequest } from "next/server";
import { kv } from "@/lib/server/kv";

export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function withinLimit(
  scope: string,
  ip: string,
  max: number,
  windowSeconds: number,
) {
  // The window index lives in the key so limits reset even with the in-memory KV, whose counters never expire.
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `rl:${scope}:${ip}:${window}`;
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, windowSeconds);
  return count <= max;
}
