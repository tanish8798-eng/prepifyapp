"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import VideoInput from "@/components/VideoInput";
import NeonCore from "@/components/NeonCore";
import Icon, { type IconName } from "@/components/Icon";

const features: {
  icon: IconName;
  color: string;
  title: string;
  description: string;
}[] = [
  {
    icon: "book",
    color: "mint",
    title: "The big picture, beautifully clear.",
    description:
      "Turn a long lecture into a thoughtful summary. Find the key ideas, follow the formulas, and see how it all connects.",
  },
  {
    icon: "cards",
    color: "peach",
    title: "A little flip. A lasting memory.",
    description:
      "Give your brain something to work with. Thoughtful flashcards turn important concepts into ideas you can actually recall.",
  },
  {
    icon: "quiz",
    color: "butter",
    title: "Find your ‘I’ve got this’ moment.",
    description:
      "Put your understanding to the test. Friendly quizzes explain the why behind each answer—because that’s where learning happens.",
  },
];

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="app-shell">
      <AppNav active="home" />
      <main id="main-content" className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow hero-label">
              <Icon name="spark" size={12} />
              YOUR NEXT LIGHTBULB MOMENT STARTS HERE
            </p>
            <h1>
              Less rewatching.
              <br />
              More <span className="serif-accent">clicking.</span>
            </h1>
            <p className="hero-description">
              Big lecture? Meet your little learning companion.
              <br />
              Turn any YouTube lesson into clear notes, clever flashcards, and a
              quiz that makes it all click.
            </p>
            <VideoInput
              onGenerate={(videoId, title) =>
                router.push(
                  `/dashboard?v=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}`,
                )
              }
            />
            <div className="hero-proof">
              <span>
                <Icon name="check" size={12} />
                No account needed
              </span>
              <span>
                <Icon name="check" size={12} />
                Your lecture, your pace
              </span>
              <span>
                <Icon name="check" size={12} />A little smarter, every time
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="A glowing study core surrounded by summary notes, flashcards and a quiz"
          >
            <div className="hero-art-orbit" />
            <NeonCore size={250} icon="spark" className="hero-core" />
            <div className="art-card art-card-summary">
              <div className="art-card-title">
                <span>
                  <Icon name="book" size={15} />
                </span>
                A little clarity.
              </div>
              <div className="art-card-lines" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="art-card art-card-cards">
              <div className="art-card-title">
                <span className="butter">
                  <Icon name="cards" size={15} />
                </span>
                A moment to think.
              </div>
              <p>
                What if remembering
                <br />
                felt a little easier?
              </p>
              <small>THINK. FLIP. MAKE IT STICK.</small>
            </div>
            <div className="art-card art-card-quiz">
              <div className="art-card-title">
                <span>
                  <Icon name="quiz" size={15} />
                </span>
                Oh, now it clicks.
              </div>
              <div className="art-quiz-option">
                <span>A</span>Rewatch it one more time
              </div>
              <div className="art-quiz-option selected">
                <span>
                  <Icon name="check" size={10} />
                </span>
                Understand it for yourself
                <Icon name="spark" size={11} />
              </div>
            </div>
            <span className="art-annotation">
              One lecture.
              <br />
              Every way
              <br />
              to learn it.
            </span>
            <Icon name="spark" className="art-spark" size={38} />
            <Icon name="spark" className="art-mini-spark" size={23} />
            <span className="hero-art-caption">
              A peek at a brighter way to learn.
            </span>
          </div>
        </section>
        <div className="home-strip">
          <div>
            <p>Everything a lecture can become.</p>
            <span>
              <Icon name="transcript" size={17} />
              Searchable, clickable transcript
            </span>
            <span>
              <Icon name="chat" size={17} />
              Ask AI about any moment
            </span>
            <span>
              <Icon name="download" size={17} />
              Export to Anki, Markdown or PDF
            </span>
          </div>
        </div>
        <section className="home-section" id="features">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                NOT JUST MORE NOTES. MORE UNDERSTANDING.
              </p>
              <h2>
                Good ideas deserve
                <br />a{" "}
                <span className="serif-accent">better place to land.</span>
              </h2>
            </div>
            <p>
              Less hunting for the important parts.
              <br />
              More time making them your own. Everything you need, in one
              thoughtful study set.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature, index) => (
              <article className="feature-card" key={feature.title}>
                <span className={`feature-icon ${feature.color}`}>
                  <Icon name={feature.icon} size={25} />
                </span>
                <span className="feature-number">0{index + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="home-section workflow-section" id="workflow">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BIG IDEAS. LITTLE STEPS.</p>
              <h2>
                From “wait, what?”
                <br />
                to <span className="serif-accent">“oh, I get it.”</span>
              </h2>
            </div>
            <p>
              No setup, no complicated systems.
              <br />
              Just you, a lecture, and an AI that has read every word of it.
            </p>
          </div>
          <div className="workflow-steps">
            {[
              {
                title: "Follow your curiosity.",
                body: "Paste a YouTube link or search for a lecture. Choose something you want to understand.",
              },
              {
                title: "Let the ideas take shape.",
                body: "Prepify creates a summary, key points, flashcards and a quiz from the video’s transcript.",
              },
              {
                title: "Make it yours.",
                body: "Read at your pace. Flip through the cards. Test what clicked. Come back when you need a refresher.",
              },
            ].map((step, index) => (
              <article key={step.title} className="workflow-step">
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="home-cta">
          <NeonCore size={118} icon="spark" />
          <div>
            <h2>Your next “aha” is waiting.</h2>
            <p>Start with a lecture. Leave with a little more clarity.</p>
          </div>
          <Link href="/dashboard" className="button">
            Let’s make it click
            <Icon name="arrow" size={17} />
          </Link>
        </section>
      </main>
      <footer className="app-footer">
        <span>prepify. Made for your next lightbulb moment.</span>
        <span>Less noise. More learning.</span>
      </footer>
    </div>
  );
}
