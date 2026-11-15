"use client";

import { useEffect, useRef, useState } from "react";
import type { GeneratedResult } from "@/app/api/generate/route";
import Icon, { type IconName } from "@/components/Icon";
import {
  MathText,
  SummaryRenderer,
  summarySections,
} from "@/components/LearningContent";
import AskPanel from "@/components/workspace/AskPanel";
import ExportMenu from "@/components/workspace/ExportMenu";
import FlashcardsPanel from "@/components/workspace/FlashcardsPanel";
import QuizPanel from "@/components/workspace/QuizPanel";
import TranscriptPanel from "@/components/workspace/TranscriptPanel";
import { listenToPlayer, playerCommand } from "@/components/workspace/player";
import { EmptyActivity, NextActivity } from "@/components/workspace/shared";

type Activity = "summary" | "flashcards" | "quiz";
type Tab = Activity | "points" | "transcript" | "ask" | "notes";
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: "summary", label: "Summary", icon: "book" },
  { id: "points", label: "Key points", icon: "spark" },
  { id: "flashcards", label: "Flashcards", icon: "cards" },
  { id: "quiz", label: "Quiz", icon: "quiz" },
  { id: "transcript", label: "Transcript", icon: "transcript" },
  { id: "ask", label: "Ask AI", icon: "chat" },
  { id: "notes", label: "My notes", icon: "notes" },
];

function readNotes(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((note) => typeof note === "string")
      : [];
  } catch {
    return [];
  }
}

export default function StudyWorkspace({
  result,
  title,
  onComplete,
}: {
  result: GeneratedResult;
  title: string;
  onComplete: (activity: Activity, quizScore?: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set(["summary"]));
  const [reviewed, setReviewed] = useState(false);
  const [cardsDone, setCardsDone] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [cue, setCue] = useState<number | null>(null);
  const notesKey = `prepify:notes:${result.videoId}`;
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(() => readNotes(notesKey));
  const [goals, setGoals] = useState([
    { text: "Watch the lecture", done: false },
    { text: "Review the main ideas", done: false },
  ]);
  const [newGoal, setNewGoal] = useState("");
  const player = useRef<HTMLIFrameElement>(null);
  const playerReady = useRef(false);
  const sections = summarySections(result.summary);
  const cards = result.flashcards;
  const questions = result.quizQuestions;
  const completed = Number(reviewed) + Number(cardsDone) + Number(quizFinished);
  const readMinutes = Math.max(
    1,
    Math.ceil(result.summary.split(/\s+/).length / 200),
  );
  const lessonTitle =
    title === "YouTube lecture" || title === "Loading…"
      ? sections[0]?.title || "Your learning adventure"
      : title;

  useEffect(() => {
    try {
      localStorage.setItem(notesKey, JSON.stringify(notes));
    } catch {
      // Notes still work for this session when storage is unavailable.
    }
  }, [notesKey, notes]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setVisited((value) => (value.has(next) ? value : new Set(value).add(next)));
  };
  const seekTo = (seconds: number) => {
    setSourceOpen(true);
    if (playerReady.current && player.current) {
      playerCommand(player.current, "seekTo", [seconds, true]);
      playerCommand(player.current, "playVideo");
    } else {
      setCue(Math.floor(seconds));
    }
    requestAnimationFrame(() =>
      player.current
        ?.closest(".source-card")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };
  const panel = (id: Tab) => visited.has(id) || tab === id;

  return (
    <div className="learning-workspace">
      <div className="lesson-heading">
        <div>
          <p className="eyebrow">
            <span className="status-dot" />
            Your study set is ready
          </p>
          <h1>{lessonTitle}</h1>
          <div className="lesson-meta">
            <span>
              <Icon name="clock" size={15} />
              {result.durationMinutes > 0
                ? `${result.durationMinutes} min lecture`
                : "YouTube lecture"}
            </span>
            <span>
              <Icon name="cards" size={15} />
              {cards.length} cards · {questions.length} questions
            </span>
            {result.cached && (
              <span className="cached-badge">From your saved cache</span>
            )}
          </div>
        </div>
        <div className="lesson-actions">
          <button
            type="button"
            className="button button-small"
            onClick={() => switchTab("ask")}
          >
            <Icon name="chat" size={16} />
            Ask AI
          </button>
          <ExportMenu
            title={lessonTitle}
            result={result}
            notes={notes}
            onPrint={() => window.print()}
          />
        </div>
      </div>
      <div className="learning-grid">
        <aside
          className="learning-sidebar"
          aria-label="Lecture and learning progress"
        >
          <section className={`source-card ${sourceOpen ? "is-open" : ""}`}>
            <div className="source-label">
              <span>THE ORIGINAL LECTURE</span>
              <Icon name="play" size={14} />
              <button
                type="button"
                className="source-toggle"
                aria-expanded={sourceOpen}
                aria-controls="lecture-source"
                onClick={() => setSourceOpen((value) => !value)}
              >
                <Icon name={sourceOpen ? "close" : "play"} size={15} />
                {sourceOpen ? "Hide lecture" : "Watch lecture"}
              </button>
            </div>
            <div id="lecture-source" className="source-body">
              <div className="video-player">
                <iframe
                  ref={player}
                  src={`https://www.youtube.com/embed/${result.videoId}?rel=0&enablejsapi=1${cue !== null ? `&start=${cue}&autoplay=1` : ""}`}
                  title={lessonTitle}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => {
                    playerReady.current = true;
                    listenToPlayer(player.current);
                  }}
                />
              </div>
              <div className="source-caption">
                <span className="video-platform">YouTube</span>
                <p>
                  Tap a transcript line or an AI timestamp to jump right here.
                </p>
              </div>
            </div>
          </section>
          <section className="session-progress">
            <div className="sidebar-section-heading">
              <h2>A little progress</h2>
              <span>{completed}/3</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Study activities completed"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={completed}
            >
              <span style={{ width: `${(completed / 3) * 100}%` }} />
            </div>
            {(
              [
                {
                  id: "summary",
                  label: "Understand the ideas",
                  done: reviewed,
                },
                { id: "flashcards", label: "Make them stick", done: cardsDone },
                {
                  id: "quiz",
                  label: "Put them to the test",
                  done: quizFinished,
                },
              ] as const
            ).map((activity, index) => (
              <button
                key={activity.id}
                className={`progress-item ${activity.done ? "done" : ""}`}
                onClick={() => switchTab(activity.id)}
              >
                <span>
                  {activity.done ? (
                    <Icon name="check" size={13} />
                  ) : (
                    `0${index + 1}`
                  )}
                </span>
                {activity.label}
                <Icon name="chevron" size={14} />
              </button>
            ))}
          </section>
          {tab === "summary" && sections.length > 0 && (
            <nav className="summary-contents" aria-label="Summary contents">
              <p className="eyebrow">IN THIS SUMMARY</p>
              {sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          )}
          <div className="sidebar-note">
            <Icon name="spark" size={17} />
            <p>
              AI helps you learn, not skip the thinking. Check important details
              against the lecture.
            </p>
          </div>
        </aside>
        <div className="learning-main">
          <div
            className="study-tabs"
            role="tablist"
            aria-label="Learning activities"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls="study-panel"
                tabIndex={tab === item.id ? 0 : -1}
                className={`study-tab ${tab === item.id ? "active" : ""}`}
                onClick={() => switchTab(item.id)}
                onKeyDown={(event) => {
                  const index = tabs.findIndex((entry) => entry.id === tab);
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                      event.key,
                    )
                  ) {
                    event.preventDefault();
                    const next =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              tabs.length) %
                            tabs.length;
                    switchTab(tabs[next].id);
                    document.getElementById(`tab-${tabs[next].id}`)?.focus();
                  }
                }}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.id === "flashcards" && <small>{cards.length}</small>}
                {item.id === "quiz" && <small>{questions.length}</small>}
              </button>
            ))}
          </div>
          <section
            id="study-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className={`study-panel panel-${tab}`}
          >
            <div
              className="summary-view activity-enter"
              hidden={tab !== "summary"}
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">THE BIG PICTURE</p>
                  <h2>Understand, don’t just rewatch.</h2>
                  <p>The lecture, distilled into ideas worth keeping.</p>
                </div>
                <span className="reading-time">
                  <Icon name="clock" size={15} />
                  {readMinutes} min read
                </span>
              </div>
              {result.keyPoints.length > 0 && (
                <div className="big-idea">
                  <span>
                    <Icon name="spark" size={18} />A GOOD PLACE TO START
                  </span>
                  <MathText text={result.keyPoints[0]} />
                </div>
              )}
              <SummaryRenderer text={result.summary} />
              <div className="summary-actions">
                <p>
                  {reviewed
                    ? "One step closer to making this yours."
                    : "Got the big picture? Let’s make it stick."}
                </p>
                <button
                  className={`button ${reviewed ? "button-soft" : ""}`}
                  disabled={reviewed}
                  onClick={() => {
                    setReviewed(true);
                    onComplete("summary");
                  }}
                >
                  <Icon name="check" size={17} />
                  {reviewed ? "Summary reviewed" : "Mark as reviewed"}
                </button>
              </div>
              <NextActivity
                title="Knowing it is good. Remembering it is better."
                label="Try the flashcards"
                icon="cards"
                onClick={() => switchTab("flashcards")}
              />
            </div>
            {panel("points") && (
              <div className="activity-enter" hidden={tab !== "points"}>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">YOUR LIGHTBULB MOMENTS</p>
                    <h2>The ideas that matter.</h2>
                    <p>
                      {result.keyPoints.length} takeaways to connect the dots.
                    </p>
                  </div>
                  <span className="activity-symbol peach">
                    <Icon name="spark" size={24} />
                  </span>
                </div>
                <div className="takeaway-list">
                  {result.keyPoints.map((point, index) => (
                    <article className="takeaway-card" key={index}>
                      <span className="takeaway-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <MathText text={point} />
                    </article>
                  ))}
                </div>
                {!result.keyPoints.length && (
                  <EmptyActivity text="This lecture didn’t include separate key points. The summary still has the big picture." />
                )}
                <NextActivity
                  title="Turn those ideas into long-term memory."
                  label="Practice flashcards"
                  icon="cards"
                  onClick={() => switchTab("flashcards")}
                />
              </div>
            )}
            {panel("flashcards") && (
              <div className="activity-enter" hidden={tab !== "flashcards"}>
                <FlashcardsPanel
                  cards={cards}
                  storageKey={`prepify:ratings:${result.videoId}:${result.generatedAt}`}
                  active={tab === "flashcards"}
                  onAllSeen={() => {
                    setCardsDone(true);
                    onComplete("flashcards");
                  }}
                  onQuiz={() => switchTab("quiz")}
                />
              </div>
            )}
            {panel("quiz") && (
              <div className="activity-enter" hidden={tab !== "quiz"}>
                <QuizPanel
                  questions={questions}
                  active={tab === "quiz"}
                  onFinish={(percent) => {
                    setQuizFinished(true);
                    onComplete("quiz", percent);
                  }}
                  onSummary={() => switchTab("summary")}
                />
              </div>
            )}
            {panel("transcript") && (
              <div className="activity-enter" hidden={tab !== "transcript"}>
                <TranscriptPanel
                  videoId={result.videoId}
                  active={tab === "transcript"}
                  player={player}
                  onSeek={seekTo}
                />
              </div>
            )}
            {panel("ask") && (
              <div className="activity-enter" hidden={tab !== "ask"}>
                <AskPanel videoId={result.videoId} onSeek={seekTo} />
              </div>
            )}
            {panel("notes") && (
              <div className="activity-enter" hidden={tab !== "notes"}>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">IN YOUR OWN WORDS</p>
                    <h2>A space for your thinking.</h2>
                    <p>
                      Jot down a connection, a question, or something worth
                      remembering.
                    </p>
                  </div>
                  <span className="activity-symbol mint">
                    <Icon name="notes" size={24} />
                  </span>
                </div>
                {!notes.length && (
                  <div className="notes-empty">
                    <span className="neon-orb" aria-hidden="true">
                      <Icon name="notes" size={28} />
                    </span>
                    <p>Good ideas deserve a place to land.</p>
                  </div>
                )}
                <div className="personal-notes">
                  {notes.map((note, index) => (
                    <article key={index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{note}</p>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Delete note ${index + 1}`}
                        onClick={() =>
                          setNotes((value) =>
                            value.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </article>
                  ))}
                </div>
                <form
                  className="note-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (noteText.trim()) {
                      setNotes((value) => [...value, noteText.trim()]);
                      setNoteText("");
                    }
                  }}
                >
                  <label htmlFor="personal-note">What’s on your mind?</label>
                  <textarea
                    id="personal-note"
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="The idea that clicked for me was…"
                    rows={5}
                  />
                  <div>
                    <span>Notes are saved on this device and included in exports.</span>
                    <button className="button" disabled={!noteText.trim()}>
                      <Icon name="notes" size={17} />
                      Save note
                    </button>
                  </div>
                </form>
                <details className="personal-checklist">
                  <summary>Your personal study checklist</summary>
                  {goals.map((goal, index) => (
                    <label key={index}>
                      <input
                        type="checkbox"
                        checked={goal.done}
                        onChange={() =>
                          setGoals((value) =>
                            value.map((item, itemIndex) =>
                              index === itemIndex
                                ? { ...item, done: !item.done }
                                : item,
                            ),
                          )
                        }
                      />
                      <span>{goal.text}</span>
                    </label>
                  ))}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (newGoal.trim()) {
                        setGoals((value) => [
                          ...value,
                          { text: newGoal.trim(), done: false },
                        ]);
                        setNewGoal("");
                      }
                    }}
                  >
                    <input
                      aria-label="New study goal"
                      placeholder="Add something to your checklist"
                      value={newGoal}
                      onChange={(event) => setNewGoal(event.target.value)}
                    />
                    <button
                      className="button button-small"
                      disabled={!newGoal.trim()}
                    >
                      Add
                    </button>
                  </form>
                </details>
              </div>
            )}
          </section>
        </div>
      </div>
      <PrintSheet title={lessonTitle} result={result} notes={notes} />
    </div>
  );
}

function PrintSheet({
  title,
  result,
  notes,
}: {
  title: string;
  result: GeneratedResult;
  notes: string[];
}) {
  return (
    <article className="print-sheet" aria-hidden="true">
      <header>
        <p>prepify · study set</p>
        <h1>{title}</h1>
        <p>youtube.com/watch?v={result.videoId}</p>
      </header>
      <h2>Summary</h2>
      <SummaryRenderer text={result.summary} headingIds={false} />
      {result.keyPoints.length > 0 && (
        <>
          <h2>Key points</h2>
          <ol>
            {result.keyPoints.map((point, index) => (
              <li key={index}>
                <MathText text={point} />
              </li>
            ))}
          </ol>
        </>
      )}
      {result.flashcards.length > 0 && (
        <>
          <h2>Flashcards</h2>
          <dl className="print-cards">
            {result.flashcards.map((card, index) => (
              <div key={index}>
                <dt>
                  <MathText text={card.q} />
                </dt>
                <dd>
                  <MathText text={card.a} />
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {result.quizQuestions.length > 0 && (
        <>
          <h2>Quiz</h2>
          <ol className="print-quiz">
            {result.quizQuestions.map((question, index) => (
              <li key={index}>
                <MathText text={question.q} />
                <ol type="A">
                  {question.opts.map((option, optionIndex) => (
                    <li
                      key={optionIndex}
                      className={optionIndex === question.ans ? "answer" : ""}
                    >
                      <MathText text={option} />
                    </li>
                  ))}
                </ol>
                <MathText text={question.explanation} className="print-why" />
              </li>
            ))}
          </ol>
        </>
      )}
      {notes.length > 0 && (
        <>
          <h2>My notes</h2>
          <ul>
            {notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
