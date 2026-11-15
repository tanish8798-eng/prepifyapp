"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { MathText } from "@/components/LearningContent";
import {
  EmptyActivity,
  isControlTarget,
  isTypingTarget,
} from "@/components/workspace/shared";

type Card = { q: string; a: string };
type Rating = "learning" | "known";

function readRatings(key: string, count: number): Record<number, Rating> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([index, value]) =>
          Number(index) < count && (value === "learning" || value === "known"),
      ),
    ) as Record<number, Rating>;
  } catch {
    return {};
  }
}

export default function FlashcardsPanel({
  cards,
  storageKey,
  active,
  onAllSeen,
  onQuiz,
}: {
  cards: Card[];
  storageKey: string;
  active: boolean;
  onAllSeen: () => void;
  onQuiz: () => void;
}) {
  const [order, setOrder] = useState<number[] | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [ratings, setRatings] = useState(() =>
    readRatings(storageKey, cards.length),
  );
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());

  const baseOrder = order ?? cards.map((_, index) => index);
  const deck = reviewOnly
    ? baseOrder.filter((index) => ratings[index] === "learning")
    : baseOrder;
  const spot = Math.min(position, Math.max(deck.length - 1, 0));
  const cardIndex = deck[spot];
  const card = cardIndex === undefined ? undefined : cards[cardIndex];
  const known = Object.values(ratings).filter((value) => value === "known").length;
  const learning = Object.values(ratings).filter(
    (value) => value === "learning",
  ).length;
  const allSeen = cards.length > 0 && seen.size === cards.length;

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ratings));
    } catch {
      // Storage can be unavailable in private browsing; ratings still work for this session.
    }
  }, [storageKey, ratings]);

  const move = (next: number) => {
    if (next < 0 || next >= deck.length) return;
    setPosition(next);
    setFlipped(false);
  };
  const flip = () => {
    if (cardIndex === undefined) return;
    setFlipped((value) => !value);
    if (!flipped && !seen.has(cardIndex)) {
      const next = new Set(seen).add(cardIndex);
      setSeen(next);
      if (next.size === cards.length) onAllSeen();
    }
  };
  const rate = (rating: Rating) => {
    if (cardIndex === undefined || !flipped) return;
    const nextRatings = { ...ratings, [cardIndex]: rating };
    setRatings(nextRatings);
    setFlipped(false);
    if (reviewOnly && rating === "known") {
      const remaining = baseOrder.filter(
        (index) => nextRatings[index] === "learning",
      ).length;
      setPosition(spot < remaining ? spot : 0);
    } else if (spot < deck.length - 1) setPosition(spot + 1);
  };
  const toggleShuffle = () => {
    if (order) setOrder(null);
    else {
      const shuffled = cards.map((_, index) => index);
      for (let index = shuffled.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
      }
      setOrder(shuffled);
    }
    setPosition(0);
    setFlipped(false);
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === " " && !isControlTarget(event.target)) {
        event.preventDefault();
        flip();
      } else if (event.key === "ArrowRight" && !isControlTarget(event.target))
        move(spot + 1);
      else if (event.key === "ArrowLeft" && !isControlTarget(event.target))
        move(spot - 1);
      else if (event.key === "1") rate("learning");
      else if (event.key === "2") rate("known");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flashcard-view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">A LITTLE RECALL GOES A LONG WAY</p>
          <h2>Meet your memory’s new best friend.</h2>
          <p>Think of your answer, flip, then tell us how it went.</p>
        </div>
        <span className="activity-symbol mint">
          <Icon name="cards" size={24} />
        </span>
      </div>
      {!cards.length ? (
        <EmptyActivity text="No flashcards were returned for this lecture. Explore the summary or try the quiz." />
      ) : (
        <>
          <div className="practice-bar">
            <div className="practice-stats" aria-live="polite">
              <span className="stat-known">
                <Icon name="check" size={13} />
                {known} got it
              </span>
              <span className="stat-learning">
                <Icon name="refresh" size={13} />
                {learning} still learning
              </span>
              <span className="stat-new">
                {cards.length - known - learning} not rated
              </span>
            </div>
            <div className="practice-actions">
              <button
                type="button"
                className={`chip-toggle ${reviewOnly ? "active" : ""}`}
                aria-pressed={reviewOnly}
                disabled={!reviewOnly && !learning}
                onClick={() => {
                  setReviewOnly((value) => !value);
                  setPosition(0);
                  setFlipped(false);
                }}
              >
                <Icon name="target" size={14} />
                {reviewOnly ? "Show all cards" : `Review ${learning} still learning`}
              </button>
              <button
                type="button"
                className={`chip-toggle ${order ? "active" : ""}`}
                aria-pressed={Boolean(order)}
                onClick={toggleShuffle}
              >
                <Icon name="shuffle" size={14} />
                Shuffle
              </button>
            </div>
          </div>
          {card ? (
            <>
              <div className="card-progress">
                <span>
                  Card <strong>{spot + 1}</strong> of {deck.length}
                  {reviewOnly && " in review"}
                </span>
                <span>{seen.size} explored</span>
              </div>
              <button
                key={cardIndex}
                className={`flashcard ${flipped ? "is-flipped" : ""}`}
                onClick={flip}
                aria-pressed={flipped}
                aria-label={
                  flipped
                    ? "Showing answer. Flip to question"
                    : "Showing question. Flip to reveal answer"
                }
              >
                <span className="flashcard-inner">
                  <span
                    className="flashcard-face flashcard-front"
                    aria-hidden={flipped}
                  >
                    <span className="flashcard-label">
                      <Icon name="cards" size={16} />A MOMENT TO THINK
                      {ratings[cardIndex] && (
                        <em className={`rating-badge ${ratings[cardIndex]}`}>
                          {ratings[cardIndex] === "known"
                            ? "Got it"
                            : "Still learning"}
                        </em>
                      )}
                    </span>
                    <MathText text={card.q} />
                    <span className="flip-hint">
                      <Icon name="refresh" size={15} />
                      Click or press Space to reveal
                    </span>
                    <span className="flashcard-decoration" />
                  </span>
                  <span
                    className="flashcard-face flashcard-back"
                    aria-hidden={!flipped}
                  >
                    <span className="flashcard-label">
                      <Icon name="spark" size={16} />
                      THERE’S YOUR LIGHTBULB MOMENT
                    </span>
                    <MathText text={card.a} />
                    <span className="flip-hint">
                      <Icon name="refresh" size={15} />
                      Flip back to the question
                    </span>
                  </span>
                </span>
              </button>
              <div
                className={`rate-row ${flipped ? "is-visible" : ""}`}
                aria-hidden={!flipped}
              >
                <p>How did that go?</p>
                <button
                  type="button"
                  className="rate-button learning"
                  tabIndex={flipped ? 0 : -1}
                  onClick={() => rate("learning")}
                >
                  <Icon name="refresh" size={16} />
                  Still learning
                  <kbd>1</kbd>
                </button>
                <button
                  type="button"
                  className="rate-button known"
                  tabIndex={flipped ? 0 : -1}
                  onClick={() => rate("known")}
                >
                  <Icon name="check" size={16} />
                  Got it
                  <kbd>2</kbd>
                </button>
              </div>
              <div className="flashcard-controls">
                <button
                  className="button button-outline"
                  disabled={spot === 0}
                  onClick={() => move(spot - 1)}
                >
                  <Icon name="back" size={17} />
                  Previous
                </button>
                <div className="card-dots" aria-label="Choose a flashcard">
                  {deck.map((index, deckIndex) => (
                    <button
                      key={index}
                      className={`${deckIndex === spot ? "current" : ""} ${seen.has(index) ? "seen" : ""} ${ratings[index] ?? ""}`}
                      aria-label={`Go to card ${deckIndex + 1}`}
                      aria-current={deckIndex === spot ? "step" : undefined}
                      onClick={() => move(deckIndex)}
                    />
                  ))}
                </div>
                <button
                  className="button button-outline"
                  disabled={spot === deck.length - 1}
                  onClick={() => move(spot + 1)}
                >
                  Next
                  <Icon name="arrow" size={17} />
                </button>
              </div>
              <p className="shortcut-hint">
                <kbd>Space</kbd> flip · <kbd>←</kbd> <kbd>→</kbd> move ·{" "}
                <kbd>1</kbd> still learning · <kbd>2</kbd> got it
              </p>
            </>
          ) : (
            <div className="completion-strip" role="status">
              <span className="neon-orb small" aria-hidden="true">
                <Icon name="check" size={22} />
              </span>
              <div>
                <strong>Nothing left to review.</strong>
                <p>Every card in this deck is marked “Got it”.</p>
              </div>
              <button
                className="button button-small"
                onClick={() => {
                  setReviewOnly(false);
                  setPosition(0);
                }}
              >
                Show all cards
              </button>
            </div>
          )}
          {allSeen && card && (
            <div className="completion-strip" role="status">
              <span className="neon-orb small" aria-hidden="true">
                <Icon name="spark" size={22} />
              </span>
              <div>
                <strong>Look at you, connecting the dots.</strong>
                <p>
                  You’ve explored every card.
                  {learning
                    ? ` ${learning} still need${learning === 1 ? "s" : ""} a little practice.`
                    : " Ready for a little challenge?"}
                </p>
              </div>
              <button className="button button-small" onClick={onQuiz}>
                Try the quiz
                <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
