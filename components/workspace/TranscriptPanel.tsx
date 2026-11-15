"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Icon from "@/components/Icon";
import { formatTime, usePlayerTime } from "@/components/workspace/player";

type Segment = { start: number; text: string };

function highlight(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const parts: (string | React.ReactElement)[] = [];
  let from = 0;
  let index = lower.indexOf(query);
  while (index !== -1) {
    parts.push(text.slice(from, index));
    parts.push(<mark key={index}>{text.slice(index, index + query.length)}</mark>);
    from = index + query.length;
    index = lower.indexOf(query, from);
  }
  parts.push(text.slice(from));
  return parts;
}

export default function TranscriptPanel({
  videoId,
  active,
  player,
  onSeek,
}: {
  videoId: string;
  active: boolean;
  player: RefObject<HTMLIFrameElement | null>;
  onSeek: (seconds: number) => void;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [follow, setFollow] = useState(true);
  const list = useRef<HTMLOListElement>(null);
  const currentTime = usePlayerTime(player, active);
  const term = query.trim().toLowerCase();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/transcript?v=${encodeURIComponent(videoId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.segments))
          throw new Error(data.error || "The transcript couldn’t be loaded.");
        setSegments(data.segments);
        setDuration(data.durationSeconds || 0);
        setStatus("ready");
      })
      .catch((caught: Error) => {
        if (controller.signal.aborted) return;
        setError(caught.message || "The transcript couldn’t be loaded.");
        setStatus("error");
      });
    return () => controller.abort();
  }, [videoId, attempt]);

  const visible = useMemo(
    () =>
      segments
        .map((segment, index) => ({ ...segment, index }))
        .filter((segment) => !term || segment.text.toLowerCase().includes(term)),
    [segments, term],
  );

  let current = -1;
  if (currentTime > 0)
    for (let index = 0; index < segments.length; index++) {
      if (segments[index].start <= currentTime) current = index;
      else break;
    }

  useEffect(() => {
    if (!follow || term || current < 0 || !active) return;
    const container = list.current;
    const row = container?.querySelector<HTMLElement>(
      `[data-index="${current}"]`,
    );
    if (!container || !row) return;
    // The list is position: relative, so offsetTop is measured from its top edge.
    const top = row.offsetTop;
    if (
      top < container.scrollTop ||
      top + row.offsetHeight > container.scrollTop + container.clientHeight
    )
      container.scrollTo({ top: Math.max(0, top - 80), behavior: "smooth" });
  }, [current, follow, term, active]);

  return (
    <div className="transcript-view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">EVERY WORD, ONE CLICK AWAY</p>
          <h2>Jump to the moment it clicked.</h2>
          <p>Search the lecture and tap any line to play it from there.</p>
        </div>
        <span className="activity-symbol cyan">
          <Icon name="transcript" size={24} />
        </span>
      </div>
      {status === "loading" ? (
        <div className="transcript-loading" role="status">
          <span className="spinner" />
          Loading the transcript…
        </div>
      ) : status === "error" ? (
        <div className="transcript-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            <Icon name="refresh" size={15} />
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="transcript-toolbar">
            <label className="transcript-search">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the transcript…"
                aria-label="Search the transcript"
              />
            </label>
            <span className="transcript-count" aria-live="polite">
              {term
                ? `${visible.length} match${visible.length === 1 ? "" : "es"}`
                : `${segments.length} moments · ${formatTime(duration)}`}
            </span>
            <label className="transcript-follow">
              <input
                type="checkbox"
                checked={follow}
                onChange={(event) => setFollow(event.target.checked)}
              />
              Follow along
            </label>
          </div>
          {visible.length ? (
            <ol className="transcript-list" ref={list}>
              {visible.map((segment) => (
                <li key={segment.index} data-index={segment.index}>
                  <button
                    type="button"
                    className={`transcript-line ${segment.index === current ? "is-current" : ""}`}
                    aria-current={segment.index === current ? "time" : undefined}
                    onClick={() => onSeek(segment.start)}
                  >
                    <span className="transcript-time">
                      <Icon name="play" size={10} />
                      {formatTime(segment.start)}
                    </span>
                    <span className="transcript-text">
                      {highlight(segment.text, term)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="transcript-empty">
              Nothing matches “{query.trim()}”. Try a shorter word.
            </p>
          )}
        </>
      )}
    </div>
  );
}
