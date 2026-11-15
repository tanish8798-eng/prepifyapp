"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GeneratedResult } from "@/app/api/generate/route";
import type { HistoryEntry } from "@/app/api/history/route";
import AppNav from "@/components/AppNav";
import VideoInput from "@/components/VideoInput";
import StudyWorkspace from "@/components/StudyWorkspace";
import NeonCore from "@/components/NeonCore";
import Icon from "@/components/Icon";

const stages = [
  "Finding the words behind the lecture",
  "Connecting the important ideas",
  "Shaping your summary and key points",
  "Making a little room for recall",
  "Putting the finishing touches on your quiz",
];
type GenerationResponse = GeneratedResult & {
  usedToday?: number;
  error?: string;
  requiresPremium?: boolean;
  durationError?: boolean;
  dailyLimit?: boolean;
  used?: number;
};

function recordActivity(action: string, videoId: string) {
  return fetch("/api/xp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, videoId }),
  }).catch(() => {});
}

function DashboardInner() {
  const params = useSearchParams();
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [title, setTitle] = useState("YouTube lecture");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [lastAttempt, setLastAttempt] = useState({
    videoId: "",
    title: "YouTube lecture",
  });
  const request = useRef<AbortController | null>(null);
  const handledParam = useRef("");
  const historyEntry = useRef<HistoryEntry | null>(null);
  const completed = useRef(new Set<string>());
  const initialVideo = params.get("v") || "";
  const initialTitle = params.get("title") || "YouTube lecture";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/generate?status=1", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.usedToday === "number") setDailyUsed(data.usedToday);
        if (typeof data.limit === "number") setDailyLimit(data.limit);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(
      () => setStage((value) => Math.min(value + 1, stages.length - 1)),
      4500,
    );
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );

  const generate = useCallback(
    async (videoId: string, videoTitle = "YouTube lecture") => {
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId) || request.current) return;
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setStage(0);
      setError("");
      setLastAttempt({ videoId, title: videoTitle });
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
          signal: controller.signal,
        });
        const data = (await response.json()) as GenerationResponse;
        if (controller.signal.aborted) return;
        if (typeof data.usedToday === "number") setDailyUsed(data.usedToday);
        if (!response.ok) {
          if (data.dailyLimit && typeof data.used === "number")
            setDailyUsed(data.used);
          throw new Error(
            data.requiresPremium || data.durationError
              ? `This lecture is ${data.durationMinutes || "over 180"} minutes long. Choose a video under 3 hours and we’ll take it from there.`
              : data.error ||
                  "We couldn’t prepare this lecture. Please try again.",
          );
        }
        setResult(data);
        setTitle(videoTitle);
        completed.current = new Set();
        void recordActivity("video_loaded", videoId);
        const entry: HistoryEntry = {
          id: videoId,
          videoId,
          title:
            videoTitle === "YouTube lecture"
              ? data.summary.match(/^#{1,3}\s+(.+)/m)?.[1] || videoTitle
              : videoTitle,
          subject: "General",
          date: new Date().toLocaleDateString(),
          duration: data.durationMinutes || 0,
          progress: 0,
          quizScore: null,
          summary: data.summary.slice(0, 200),
          topics: data.keyPoints
            .slice(0, 3)
            .map((point) => point.split(" ").slice(0, 3).join(" ")),
          watchedAt: Date.now(),
        };
        historyEntry.current = entry;
        void fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entry }),
        }).catch(() => {});
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Connection interrupted. Please try again.",
          );
      } finally {
        if (request.current === controller) {
          request.current = null;
          if (!controller.signal.aborted) setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!initialVideo || handledParam.current === initialVideo) return;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(initialVideo)) return;
    // Cleanup keeps Strict Mode’s mount replay from generating the same lecture twice.
    const timer = setTimeout(() => {
      handledParam.current = initialVideo;
      void generate(initialVideo, initialTitle);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialVideo, initialTitle, generate]);

  useEffect(() => {
    if (!result || loading) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchSeconds: 30 }),
        }).catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [result, loading]);

  const onComplete = (
    activity: "summary" | "flashcards" | "quiz",
    quizScore?: number,
  ) => {
    if (!result) return;
    if (!completed.current.has(activity)) {
      completed.current.add(activity);
      void recordActivity(
        activity === "summary" ? "summary_viewed" : `${activity}_completed`,
        result.videoId,
      );
    }
    if (quizScore === 100 && !completed.current.has("perfect")) {
      completed.current.add("perfect");
      void recordActivity("perfect_quiz", result.videoId);
    }
    if (historyEntry.current) {
      const activities = ["summary", "flashcards", "quiz"].filter((item) =>
        completed.current.has(item),
      ).length;
      historyEntry.current = {
        ...historyEntry.current,
        progress: Math.round((activities / 3) * 100),
        ...(typeof quizScore === "number" ? { quizScore } : {}),
      };
      void fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: historyEntry.current }),
      }).catch(() => {});
    }
  };

  return (
    <div className="app-shell">
      <AppNav
        active="dashboard"
        dailyUsed={dailyUsed}
        dailyLimit={dailyLimit}
      />
      <main id="main-content" className="dashboard-main">
        {!result && !loading && (
          <section className="learn-start">
            <div className="learn-start-copy">
              <p className="eyebrow">
                <span className="status-dot" />
                LET’S MAKE SOMETHING CLICK
              </p>
              <h1>
                What are you
                <br />
                curious about <span className="serif-accent">today?</span>
              </h1>
              <p>
                One lecture. Clearer ideas. A study set that helps you actually
                remember.
              </p>
            </div>
            <div className="learn-start-mascot">
              <NeonCore size={180} icon="play" />
              <span>Big ideas. Little steps.</span>
            </div>
            <div className="learn-start-input">
              <VideoInput onGenerate={generate} />
            </div>
            <div className="learning-promise">
              {[
                {
                  icon: "book",
                  label: "Understand it",
                  detail: "A thoughtful summary",
                },
                {
                  icon: "cards",
                  label: "Remember it",
                  detail: "Flashcards that click",
                },
                {
                  icon: "quiz",
                  label: "Make it yours",
                  detail: "A confidence-building quiz",
                },
              ].map((item, index) => (
                <div key={item.label}>
                  <span className={`promise-icon promise-${index}`}>
                    <Icon
                      name={item.icon as "book" | "cards" | "quiz"}
                      size={22}
                    />
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span className="promise-step">0{index + 1}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {result && !loading && (
          <div className="workspace-toolbar">
            <a
              href="/dashboard"
              onClick={(event) => {
                event.preventDefault();
                setResult(null);
                setError("");
                historyEntry.current = null;
              }}
              className="toolbar-back"
            >
              <Icon name="back" size={16} />A new adventure
            </a>
            <VideoInput onGenerate={generate} compact />
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">
              <Icon name="spark" size={21} />
            </span>
            <div>
              <strong>A little bump in the learning road.</strong>
              <p>{error}</p>
            </div>
            <button
              className="button button-outline button-small"
              onClick={() => generate(lastAttempt.videoId, lastAttempt.title)}
            >
              Try again
            </button>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        {loading && (
          <section
            className="generation-state"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="generation-illustration">
              <span className="generation-orbit" />
              <NeonCore size={170} icon="spark" className="is-working" />
            </div>
            <p className="eyebrow">GREAT IDEAS TAKE A LITTLE SHAPING</p>
            <h1>
              Your next lightbulb moment
              <br />
              is on its way.
            </h1>
            <p>We’re turning the lecture into something you can learn from.</p>
            <div className="generation-step">
              <span className="spinner" />
              <span>{stages[stage]}…</span>
            </div>
            <div className="generation-steps">
              {["Understand", "Remember", "Practice"].map((label, index) => (
                <span
                  key={label}
                  className={stage >= index * 2 ? "active" : ""}
                >
                  <Icon
                    name={index === 0 ? "book" : index === 1 ? "cards" : "quiz"}
                    size={19}
                  />
                  {label}
                </span>
              ))}
            </div>
            <p className="generation-footnote">
              Longer lectures can take a little more time. Your place is right
              here.
            </p>
          </section>
        )}
        {result && !loading && (
          <StudyWorkspace
            key={`${result.videoId}-${result.generatedAt}`}
            result={result}
            title={title}
            onComplete={onComplete}
          />
        )}
      </main>
      <footer className="app-footer">
        <span>Made for your next lightbulb moment.</span>
        <span>prepify. A little smarter, every time.</span>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="page-loading">
          <span className="spinner" />
          Getting your workspace ready…
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
