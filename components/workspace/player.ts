"use client";

import { useEffect, useState, type RefObject } from "react";

export function playerCommand(
  frame: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = [],
) {
  frame?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*",
  );
}

export function listenToPlayer(frame: HTMLIFrameElement | null) {
  frame?.contentWindow?.postMessage(
    JSON.stringify({ event: "listening", id: "prepify", channel: "widget" }),
    "*",
  );
}

export function usePlayerTime(
  frame: RefObject<HTMLIFrameElement | null>,
  enabled: boolean,
) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const onMessage = (event: MessageEvent) => {
      if (
        !/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(event.origin) ||
        event.source !== frame.current?.contentWindow ||
        typeof event.data !== "string"
      )
        return;
      try {
        const data = JSON.parse(event.data) as {
          event?: string;
          info?: { currentTime?: number };
        };
        const time = data.info?.currentTime;
        if (typeof time === "number") setSeconds(Math.floor(time));
      } catch {
        // Ignore non-JSON messages from the player.
      }
    };
    window.addEventListener("message", onMessage);
    listenToPlayer(frame.current);
    return () => window.removeEventListener("message", onMessage);
  }, [frame, enabled]);
  return seconds;
}

export function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}
