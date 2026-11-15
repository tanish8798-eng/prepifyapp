"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import Icon from "@/components/Icon";
import NeonCore from "@/components/NeonCore";

type Entry = {
  id: string;
  displayName: string;
  xp: number;
  streak: number;
  videosWatched: number;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sort, setSort] = useState<"xp" | "streak" | "videosWatched">("xp");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/leaderboard", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setEntries(data.leaderboard || []))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b[sort] - a[sort]),
    [entries, sort],
  );
  return (
    <div className="app-shell">
      <AppNav active="leaderboard" />
      <main id="main-content" className="library-main">
        <div className="library-heading">
          <div>
            <p className="eyebrow">YOUR EXISTING LEARNING RECORDS</p>
            <h1>A little learning adds up.</h1>
            <p>
              Your original learning records are still here. The focus stays on
              understanding.
            </p>
          </div>
          <label className="record-sort">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="xp">Learning points</option>
              <option value="videosWatched">Lectures</option>
              <option value="streak">Existing streak</option>
            </select>
          </label>
        </div>
        {loading ? (
          <div className="page-loading records-loading">
            <span className="spinner" />
            Loading learning records…
          </div>
        ) : error || !sorted.length ? (
          <div className="library-empty">
            <NeonCore size={130} icon="book" />
            <h2>
              {error
                ? "Records are taking a moment."
                : "Your next chapter starts with a lecture."}
            </h2>
            <p>
              {error
                ? "We couldn’t connect to the learning records. Please refresh to try again."
                : "Learning activity will appear here as you explore your study sets."}
            </p>
            <Link className="button" href="/dashboard">
              Keep learning
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        ) : (
          <div className="records-table">
            <div className="record-row record-heading">
              <span>#</span>
              <span>Learner</span>
              <span>Lectures</span>
              <span>Points</span>
            </div>
            {sorted.map((entry, index) => (
              <div key={entry.id} className="record-row">
                <span className="record-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="record-person">
                  <span>{entry.displayName.charAt(0).toUpperCase()}</span>
                  <strong>{entry.displayName}</strong>
                </span>
                <span>{entry.videosWatched}</span>
                <span>{entry.xp}</span>
              </div>
            ))}
          </div>
        )}
        <Link href="/dashboard" className="legacy-link">
          <Icon name="back" size={14} />
          Back to your learning space
        </Link>
      </main>
      <footer className="app-footer">
        <span>Understanding is the part that matters.</span>
        <span>prepify. Learn at your own pace.</span>
      </footer>
    </div>
  );
}
