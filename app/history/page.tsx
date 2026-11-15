"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { HistoryEntry } from "@/app/api/history/route";
import AppNav from "@/components/AppNav";
import Icon from "@/components/Icon";
import NeonCore from "@/components/NeonCore";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [totalWatchSeconds, setTotalWatchSeconds] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/history", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setTotalWatchSeconds(
          typeof data.totalWatchSeconds === "number"
            ? data.totalWatchSeconds
            : 0,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(
    () =>
      entries.filter((entry) =>
        [entry.title, entry.subject, entry.summary, ...(entry.topics || [])]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [entries, query],
  );
  const scored = entries.filter((entry) => typeof entry.quizScore === "number");
  const average = scored.length
    ? Math.round(
        scored.reduce((sum, entry) => sum + (entry.quizScore || 0), 0) /
          scored.length,
      )
    : null;
  return (
    <div className="app-shell">
      <AppNav active="history" />
      <main id="main-content" className="library-main">
        <div className="library-heading">
          <div>
            <p className="eyebrow">
              <Icon name="book" size={14} />A LITTLE KNOWLEDGE, KEPT CLOSE
            </p>
            <h1>Your curious little library.</h1>
            <p>Pick up an idea where you left it. Your study sets live here.</p>
          </div>
          <label className="library-search">
            <Icon name="search" size={17} />
            <input
              aria-label="Search your study sets"
              placeholder="Find something you learned…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="library-stats">
          {[
            { value: entries.length, label: "Lectures explored" },
            {
              value: `${(totalWatchSeconds / 3600).toFixed(1)}h`,
              label: "Time in your learning space",
            },
            {
              value: entries.filter((entry) => entry.progress >= 100).length,
              label: "Study sets completed",
            },
            {
              value: average === null ? "—" : `${average}%`,
              label: "Average quiz score",
            },
          ].map((stat) => (
            <div className="library-stat" key={stat.label}>
              <strong>{loading ? "—" : stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        {loading ? (
          <div
            className="library-skeleton"
            aria-label="Loading your library"
            role="status"
          >
            <span />
            <span />
            <span />
          </div>
        ) : error ? (
          <div className="library-empty" role="alert">
            <NeonCore size={120} icon="refresh" />
            <h2>Your library is taking a moment.</h2>
            <p>
              We couldn’t connect to your saved study sets. Please refresh to
              try again.
            </p>
            <Link href="/dashboard" className="button">
              Keep learning
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        ) : !filtered.length ? (
          <div className="library-empty">
            <NeonCore size={130} icon={query ? "search" : "book"} />
            <h2>
              {query
                ? "That idea’s hiding somewhere else."
                : "Good ideas will feel at home here."}
            </h2>
            <p>
              {query
                ? "Try a different word, or clear the search to see all your study sets."
                : "Your first lecture is the start of something. Make a study set and we’ll keep it here for you."}
            </p>
            {query ? (
              <button
                className="button button-outline"
                onClick={() => setQuery("")}
              >
                Show my study sets
              </button>
            ) : (
              <Link className="button" href="/dashboard">
                Follow your curiosity
                <Icon name="arrow" size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="library-grid">
            {filtered.map((entry) => (
              <Link
                className="resource-card"
                key={entry.videoId}
                href={`/dashboard?v=${encodeURIComponent(entry.videoId)}&title=${encodeURIComponent(entry.title)}`}
              >
                <div className="resource-thumbnail">
                  <Image
                    src={`https://i.ytimg.com/vi/${entry.videoId}/hqdefault.jpg`}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 100vw, (max-width: 850px) 50vw, 33vw"
                    unoptimized
                  />
                  <span>
                    {entry.duration > 0 ? `${entry.duration} min` : "YouTube"}
                  </span>
                </div>
                <div className="resource-body">
                  <h2>{entry.title}</h2>
                  <p>
                    {entry.summary.replace(/[#*$]/g, "") ||
                      "A little more clarity, waiting for you."}
                  </p>
                  <div className="resource-tags">
                    {(entry.topics || []).slice(0, 3).map((topic, index) => (
                      <span key={index}>{topic}</span>
                    ))}
                  </div>
                  <div className="resource-footer">
                    <span>
                      <Icon name="book" size={13} />
                      {entry.progress >= 100
                        ? "Made it yours"
                        : "Keep exploring"}
                    </span>
                    <span>
                      Open study set
                      <Icon name="arrow" size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <footer className="app-footer">
        <span>Ideas worth coming back to.</span>
        <span>prepify. Keep your curiosity close.</span>
      </footer>
    </div>
  );
}
