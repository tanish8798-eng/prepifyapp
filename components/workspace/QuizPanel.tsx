"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { MathText } from "@/components/LearningContent";
import {
  EmptyActivity,
  isControlTarget,
  isTypingTarget,
} from "@/components/workspace/shared";

type Question = { q: string; opts: string[]; ans: number; explanation: string };
type Answer = { index: number; chosen: number };

export default function QuizPanel({
  questions,
  active,
  onFinish,
  onSummary,
}: {
  questions: Question[];
  active: boolean;
  onFinish: (percent: number) => void;
  onSummary: () => void;
}) {
  const [round, setRound] = useState(() => questions.map((_, index) => index));
  const [retry, setRetry] = useState(false);
  const [position, setPosition] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [finished, setFinished] = useState(false);

  const questionIndex = round[position];
  const question = questions[questionIndex];
  const current = answers.find((entry) => entry.index === questionIndex);
  const answer = current ? current.chosen : null;
  const score = answers.filter(
    (entry) => entry.chosen === questions[entry.index].ans,
  ).length;
  const missed = answers.filter(
    (entry) => entry.chosen !== questions[entry.index].ans,
  );
  const perfect = finished && !missed.length;

  const start = (indices: number[], isRetry: boolean) => {
    setRound(indices);
    setRetry(isRetry);
    setPosition(0);
    setAnswers([]);
    setFinished(false);
  };
  const choose = (option: number) => {
    if (finished || answer !== null || !question || option >= question.opts.length)
      return;
    setAnswers((value) => [...value, { index: questionIndex, chosen: option }]);
  };
  const next = () => {
    if (answer === null) return;
    if (position < round.length - 1) {
      setPosition((value) => value + 1);
      return;
    }
    setFinished(true);
    if (!retry) onFinish(Math.round((score / round.length) * 100));
  };

  useEffect(() => {
    if (!active || finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const option = /^[1-9]$/.test(key)
        ? Number(key) - 1
        : /^[a-d]$/.test(key)
          ? key.charCodeAt(0) - 97
          : -1;
      if (option >= 0) choose(option);
      else if (event.key === "Enter" && !isControlTarget(event.target)) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="quiz-view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CURIOSITY, MEET CONFIDENCE</p>
          <h2>A little challenge. A lot of clarity.</h2>
          <p>No pressure. Every answer is a chance to learn.</p>
        </div>
        <span className="activity-symbol butter">
          <Icon name="quiz" size={24} />
        </span>
      </div>
      {!questions.length ? (
        <EmptyActivity text="No quiz questions were returned. The summary and flashcards are still here for you." />
      ) : finished ? (
        <div className="quiz-results" role="status">
          <div className="celebration-dots" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span
                key={index}
                style={{ "--i": index } as React.CSSProperties}
              />
            ))}
          </div>
          <span className="neon-orb large" aria-hidden="true">
            <Icon name={perfect ? "check" : "spark"} size={44} />
          </span>
          <p className="eyebrow">
            {retry ? "RETRY ROUND COMPLETE" : "ONE MORE LIGHTBULB MOMENT"}
          </p>
          <h3>
            {perfect
              ? "You really know your stuff."
              : "That’s how learning happens."}
          </h3>
          <p>
            {perfect
              ? "Every idea clicked. Nice work making this lecture your own."
              : "Right answers build confidence. The ones you missed show you what to explore next."}
          </p>
          <div className="score-display">
            <strong>
              {score}
              <span>/{round.length}</span>
            </strong>
            <span>
              {retry
                ? "answered correctly this retry"
                : "questions answered correctly"}
            </span>
          </div>
          <div className="result-actions">
            {missed.length > 0 && (
              <button
                className="button"
                onClick={() =>
                  start(
                    missed.map((entry) => entry.index),
                    true,
                  )
                }
              >
                <Icon name="target" size={17} />
                Retry the {missed.length} I missed
              </button>
            )}
            <button
              className={`button ${missed.length ? "button-outline" : ""}`}
              onClick={() =>
                start(
                  questions.map((_, index) => index),
                  false,
                )
              }
            >
              <Icon name="refresh" size={17} />
              {retry ? "Take the full quiz" : "Try again"}
            </button>
            <button className="button button-outline" onClick={onSummary}>
              Revisit the summary
            </button>
          </div>
          {missed.length > 0 && (
            <div className="missed-review">
              <h4>Worth another look</h4>
              {missed.map((entry) => {
                const item = questions[entry.index];
                return (
                  <article key={entry.index}>
                    <span className="question-number">
                      {String(entry.index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <MathText text={item.q} className="missed-question" />
                      <div className="missed-answer wrong">
                        <Icon name="close" size={13} />
                        <span>Your answer:</span>
                        <MathText text={item.opts[entry.chosen] ?? ""} />
                      </div>
                      <div className="missed-answer right">
                        <Icon name="check" size={13} />
                        <span>Correct:</span>
                        <MathText text={item.opts[item.ans] ?? ""} />
                      </div>
                      <MathText
                        text={item.explanation}
                        className="missed-explanation"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        question && (
          <>
            <div className="quiz-progress-label">
              <span>
                Question <strong>{position + 1}</strong> of {round.length}
                {retry && <em className="retry-badge">Retry round</em>}
              </span>
              <span>
                <kbd>1</kbd>–<kbd>{question.opts.length}</kbd> answer ·{" "}
                <kbd>Enter</kbd> next
              </span>
            </div>
            <div
              className="progress-track quiz-track"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={round.length}
              aria-valuenow={position}
            >
              <span
                style={{
                  width: `${(position / round.length) * 100}%`,
                }}
              />
            </div>
            <div className="quiz-question" key={`${retry}-${position}`}>
              <span className="question-number">
                {String(questionIndex + 1).padStart(2, "0")}
              </span>
              <MathText text={question.q} />
            </div>
            <div className="quiz-options">
              {question.opts.map((option, index) => {
                const revealed = answer !== null;
                const correct = index === question.ans;
                const chosen = index === answer;
                const state = revealed
                  ? correct
                    ? "correct"
                    : chosen
                      ? "incorrect"
                      : "muted"
                  : "";
                return (
                  <button
                    key={index}
                    disabled={revealed}
                    className={`quiz-option ${state}`}
                    onClick={() => choose(index)}
                  >
                    <span className="option-letter">
                      {revealed && (correct || chosen) ? (
                        <Icon name={correct ? "check" : "close"} size={16} />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <MathText text={option} />
                    {revealed && (correct || chosen) && (
                      <small>{correct ? "Correct answer" : "Your answer"}</small>
                    )}
                  </button>
                );
              })}
            </div>
            {answer !== null && (
              <div
                className={`quiz-feedback ${answer === question.ans ? "correct" : ""}`}
                role="status"
              >
                <span className="feedback-icon">
                  <Icon
                    name={answer === question.ans ? "check" : "spark"}
                    size={20}
                  />
                </span>
                <div>
                  <h3>
                    {answer === question.ans
                      ? "That’s it. You’ve got this."
                      : "Not quite—and that’s okay."}
                  </h3>
                  <MathText text={question.explanation} />
                </div>
              </div>
            )}
            <div className="quiz-next">
              <p>
                {answer === null
                  ? "Choose the answer that feels right."
                  : "Understanding the why is the important part."}
              </p>
              <button className="button" disabled={answer === null} onClick={next}>
                {position === round.length - 1
                  ? "See how you did"
                  : "Next question"}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
