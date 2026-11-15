"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";

type Video = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
};

async function searchVideos(query: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/generate?q=${encodeURIComponent(query.trim().slice(0, 150))}`,
    { signal },
  );
  const data = await response.json();
  return {
    items: (Array.isArray(data.items) ? data.items : []) as Video[],
    note: typeof data.note === "string" ? data.note : "",
    error: typeof data.error === "string" ? data.error : "",
  };
}

export function extractVideoId(input: string): string | null {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(
      /^https?:\/\//.test(value) ? value : `https://${value}`,
    );
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      id = url.searchParams.get("v");
      if (!id && /^\/(embed|shorts|live|v)\//.test(url.pathname))
        id = url.pathname.split("/")[2];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const topics = [
  "Physics",
  "Calculus",
  "Machine learning",
  "Organic chemistry",
  "Economics",
  "Neuroscience",
];

export default function VideoInput({
  onGenerate,
  disabled = false,
  compact = false,
}: {
  onGenerate: (videoId: string, title: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Video | null>(null);
  const [results, setResults] = useState<Video[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState("");
  const [topicVideos, setTopicVideos] = useState<Video[]>([]);
  const [topicState, setTopicState] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const topicRequest = useRef<AbortController | null>(null);
  const videoId =
    extractVideoId(query) ||
    (selected?.title === query ? selected.videoId : null);

  useEffect(() => () => topicRequest.current?.abort(), []);

  useEffect(() => {
    if (query.trim().length < 2 || videoId || /youtu|https?:\/\//i.test(query))
      return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const data = await searchVideos(query, controller.signal);
        if (controller.signal.aborted) return;
        setResults(data.items);
        setOpen(true);
        setHighlight(-1);
        setMessage(
          data.items.length
            ? ""
            : data.note
              ? "Topic search isn’t configured here yet. You can still paste a YouTube link."
              : data.error ||
                "No captioned lectures found. Try another topic or paste a link.",
        );
      } catch {
        if (!controller.signal.aborted)
          setMessage(
            "Search couldn’t connect. Try again, or paste a YouTube link.",
          );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, videoId]);

  const exploreTopic = async (name: string) => {
    topicRequest.current?.abort();
    if (topic === name && topicState !== "error") {
      setTopic("");
      setTopicVideos([]);
      setTopicState("idle");
      return;
    }
    const controller = new AbortController();
    topicRequest.current = controller;
    setTopic(name);
    setTopicVideos([]);
    setTopicState("loading");
    try {
      const data = await searchVideos(`${name} lecture`, controller.signal);
      if (controller.signal.aborted) return;
      setTopicVideos(data.items);
      setTopicState(data.items.length ? "idle" : "error");
    } catch {
      if (!controller.signal.aborted) setTopicState("error");
    }
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setSelected(null);
    setResults([]);
    setOpen(false);
    setBusy(false);
    setMessage("");
    setHighlight(-1);
  };
  const pick = (video: Video) => {
    setSelected(video);
    setQuery(video.title);
    setResults([]);
    setOpen(false);
    setBusy(false);
    setMessage("");
    inputRef.current?.focus();
  };
  const submit = () => {
    if (videoId)
      onGenerate(
        videoId,
        selected?.title === query ? selected.title : "YouTube lecture",
      );
    else if (/youtu|https?:\/\//i.test(query))
      setMessage(
        "That link doesn’t contain a valid YouTube video. Try a watch, share or Shorts link.",
      );
    else {
      setOpen(true);
      setMessage(
        results.length
          ? "Choose a lecture from the search results to get started."
          : "Search a topic, then select a lecture—or paste its YouTube link.",
      );
    }
  };

  return (
    <div className={`video-input ${compact ? "compact" : ""}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {!compact && (
          <label className="input-label" htmlFor={id}>
            Your next learning adventure
          </label>
        )}
        <div className="video-input-frame">
          <span className="input-icon">
            <Icon name={videoId ? "link" : "search"} size={21} />
          </span>
          <input
            id={id}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="YouTube link or lecture topic"
            aria-expanded={open && results.length > 0}
            aria-controls={`${id}-results`}
            aria-autocomplete="list"
            aria-activedescendant={
              highlight >= 0 ? `${id}-option-${highlight}` : undefined
            }
            aria-describedby={`${id}-help`}
            autoComplete="off"
            maxLength={300}
            value={query}
            disabled={disabled}
            placeholder={
              compact
                ? "Find another lecture or paste a link"
                : "Paste a YouTube link or search a topic…"
            }
            onChange={(event) => changeQuery(event.target.value)}
            onFocus={() => {
              if (results.length) setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (
                results.length &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
              ) {
                event.preventDefault();
                setOpen(true);
                setHighlight(
                  (index) =>
                    (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      results.length) %
                    results.length,
                );
              }
              if (
                event.key === "Enter" &&
                open &&
                highlight >= 0 &&
                results[highlight]
              ) {
                event.preventDefault();
                pick(results[highlight]);
              }
            }}
          />
          {busy && <span className="spinner" aria-label="Searching lectures" />}
          {query && (
            <button
              type="button"
              className="icon-button clear-input"
              aria-label="Clear input"
              onClick={() => {
                changeQuery("");
                inputRef.current?.focus();
              }}
              disabled={disabled}
            >
              <Icon name="close" size={16} />
            </button>
          )}
          <button
            type="submit"
            className="button generate-button"
            disabled={disabled || !query.trim()}
          >
            {disabled
              ? "Preparing…"
              : videoId
                ? "Make my study set"
                : "Find a lecture"}
            <Icon name={videoId ? "spark" : "arrow"} size={17} />
          </button>
        </div>
      </form>
      <p
        id={`${id}-help`}
        className={`input-help ${message ? "input-message" : ""}`}
        role={message ? "status" : undefined}
      >
        {message ||
          (videoId
            ? "Ready to go. One lecture, a whole new way to learn."
            : "YouTube videos with captions · Summaries, flashcards & quizzes")}
      </p>
      {open && results.length > 0 && (
        <ul
          className="search-results"
          id={`${id}-results`}
          role="listbox"
          aria-label="Captioned lectures"
        >
          <li className="search-results-heading" role="presentation">
            Pick a lecture to make it yours
          </li>
          {results.map((video, index) => (
            <li
              key={video.videoId}
              role="option"
              id={`${id}-option-${index}`}
              aria-selected={index === highlight}
            >
              <button
                type="button"
                className={
                  index === highlight
                    ? "search-result highlighted"
                    : "search-result"
                }
                onClick={() => pick(video)}
              >
                {video.thumbnail && (
                  <Image
                    src={video.thumbnail}
                    alt=""
                    width={88}
                    height={50}
                    unoptimized
                  />
                )}
                <span>
                  <strong>{video.title}</strong>
                  <small>
                    {[video.channel, video.duration].filter(Boolean).join(" · ")}
                  </small>
                </span>
                <Icon name="chevron" size={17} />
              </button>
            </li>
          ))}
          <li role="presentation">
            <button
              type="button"
              className="search-dismiss"
              onClick={() => setOpen(false)}
            >
              Close results
            </button>
          </li>
        </ul>
      )}
      {!compact && (
        <div className="topic-suggestions">
          <span>Or get curious about</span>
          {topics.map((name) => (
            <button
              key={name}
              type="button"
              disabled={disabled}
              aria-pressed={topic === name}
              className={topic === name ? "active" : undefined}
              onClick={() => void exploreTopic(name)}
            >
              {name}
              <Icon name={topic === name ? "close" : "play"} size={11} />
            </button>
          ))}
        </div>
      )}
      {!compact && topic && (
        <section
          className="topic-videos"
          aria-label={`${topic} lectures`}
          aria-busy={topicState === "loading"}
        >
          <div className="topic-videos-heading">
            <p>
              <Icon name="play" size={13} />
              Captioned <strong>{topic}</strong> lectures on YouTube
            </p>
            <button
              type="button"
              className="icon-button"
              aria-label="Close topic lectures"
              onClick={() => void exploreTopic(topic)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          {topicState === "loading" ? (
            <div className="topic-video-grid" role="status">
              {Array.from({ length: 6 }, (_, index) => (
                <span className="topic-video skeleton" key={index} />
              ))}
              <span className="sr-only">Finding lectures…</span>
            </div>
          ) : topicState === "error" ? (
            <p className="topic-videos-empty" role="status">
              We couldn’t find lectures for {topic} right now.{" "}
              <button type="button" onClick={() => void exploreTopic(topic)}>
                Try again
              </button>
            </p>
          ) : (
            <div className="topic-video-grid">
              {topicVideos.map((video) => (
                <button
                  type="button"
                  className="topic-video"
                  key={video.videoId}
                  disabled={disabled}
                  onClick={() => onGenerate(video.videoId, video.title)}
                >
                  <span className="topic-video-thumb">
                    <Image
                      src={
                        video.thumbnail ||
                        `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`
                      }
                      alt=""
                      fill
                      sizes="(max-width: 600px) 100vw, 260px"
                      unoptimized
                    />
                    {video.duration && <em>{video.duration}</em>}
                    <span className="topic-video-play">
                      <Icon name="spark" size={14} />
                      Make study set
                    </span>
                  </span>
                  <strong>{video.title}</strong>
                  <small>
                    {[video.channel, video.views].filter(Boolean).join(" · ")}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
