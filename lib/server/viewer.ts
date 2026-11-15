import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export function getIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function formatGuestName(ip: string) {
  const suffix = ip.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "guest";
  return `Guest ${suffix}`;
}

export async function getViewer(req: NextRequest) {
  const token = await getToken({
    req,
    ...(process.env.NEXTAUTH_SECRET
      ? { secret: process.env.NEXTAUTH_SECRET }
      : {}),
  });

  if (token?.sub) {
    const displayName =
      (typeof token.name === "string" && token.name.trim()) ||
      (typeof token.email === "string" && token.email.trim()) ||
      `User ${token.sub.slice(-4)}`;

    return {
      id: token.sub,
      displayName,
      key: `user:${token.sub}`,
      authed: true,
    };
  }

  const ip = getIp(req);
  return {
    id: `guest:${ip}`,
    displayName: formatGuestName(ip),
    key: `guest:${ip}`,
    authed: false,
  };
}
