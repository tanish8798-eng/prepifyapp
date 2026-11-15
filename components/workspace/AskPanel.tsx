"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { MarkdownMessage } from "@/components/LearningContent";

type Message = { role: "user" | "assistant"; text: string };

const starters = [
  "Explain the main idea like I’m new to this.",
  "What are the key definitions or formulas?",
  "Give me a real-world example of this.",
  "What should I review before an exam?",
];

export default function AskPanel({
  videoId,
  onSeek,
}: {
  videoId: string;
  onSeek: (seconds: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  const ask = async (question: string) => {
    const text = question.trim().slice(0, 600);
    if (!text || pending) return;
    const history = messages.slice(-8);
    setMessages((value) => [...value, { role: "user", text }]);
    setDraft("");
    setError("");
    setPending(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, question: text, history }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || typeof data.answer !== "string")
        throw new Error(data.error || "The answer couldn’t be prepared.");
      setMessages((value) => [
        ...value,
        { role: "assistant", text: data.answer },
      ]);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setMessages((value) => value.slice(0, -1));
      setDraft(text);
      setError(
        caught instanceof Error
          ? caught.message
          : "Connection interrupted. Please try again.",
      );
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  return (
    <div className="ask-view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">YOUR LECTURE, ON CALL</p>
          <h2>Ask anything about this lecture.</h2>
          <p>
            Answers come from the lecture itself, with timestamps you can play.
          </p>
        </div>
        <span className="activity-symbol magenta">
          <Icon name="chat" size={24} />
        </span>
      </div>
      <div
        className="chat-log"
        ref={log}
        aria-live="polite"
        onClick={(event) => {
          const target = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-seek]",
          );
          if (target) onSeek(Number(target.dataset.seek));
        }}
      >
        {!messages.length && (
          <div className="chat-empty">
            <span className="chat-orb" aria-hidden="true">
              <Icon name="spark" size={26} />
            </span>
            <p>Not sure where to start? Try one of these.</p>
            <div className="chat-starters">
              {starters.map((starter) => (
                <button
                  type="button"
                  key={starter}
                  onClick={() => void ask(starter)}
                >
                  {starter}
                  <Icon name="arrow" size={14} />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={index}>
            <span className="chat-avatar" aria-hidden="true">
              <Icon name={message.role === "user" ? "notes" : "spark"} size={15} />
            </span>
            <div className="chat-bubble">
              <span className="sr-only">
                {message.role === "user" ? "You asked:" : "Answer:"}
              </span>
              {message.role === "user" ? (
                <p>{message.text}</p>
              ) : (
                <MarkdownMessage text={message.text} />
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="chat-message assistant" role="status">
            <span className="chat-avatar" aria-hidden="true">
              <Icon name="spark" size={15} />
            </span>
            <div className="chat-bubble chat-thinking">
              <span />
              <span />
              <span />
              <span className="sr-only">Thinking…</span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(draft);
        }}
      >
        <textarea
          value={draft}
          rows={2}
          maxLength={600}
          aria-label="Ask a question about the lecture"
          placeholder="Ask about a concept, a step, or an example…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(draft);
            }
          }}
        />
        <button
          className="button"
          disabled={pending || !draft.trim()}
          aria-label="Send question"
        >
          <Icon name="send" size={17} />
          <span>Ask</span>
        </button>
      </form>
      <p className="chat-footnote">
        Enter to send · Shift+Enter for a new line · AI can make mistakes, so
        check key details against the lecture.
      </p>
    </div>
  );
}
