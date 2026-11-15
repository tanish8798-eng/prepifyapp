"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import AppNav from "@/components/AppNav";
import Icon from "@/components/Icon";
import NeonCore from "@/components/NeonCore";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState("Curious learner");
  const [xp, setXp] = useState(0);
  const [count, setCount] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/xp", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        setXp(data.xp || 0);
        if (data.displayName) setDisplayName(data.displayName);
      })
      .catch(() => {});
    fetch("/api/history", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        setCount(data.entries?.length || 0);
        setWatchSeconds(data.totalWatchSeconds || 0);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <div className="app-shell">
      <AppNav active="profile" />
      <main id="main-content" className="library-main">
        <div className="profile-intro">
          <NeonCore size={112} icon="book" />
          <div>
            <p className="eyebrow">A SPACE FOR YOUR LEARNING</p>
            <h1>{session?.user?.name || displayName}</h1>
            <p>
              {session?.user?.email ||
                "You’re learning as a guest. No account needed."}
            </p>
          </div>
        </div>
        <div className="library-stats profile-stats">
          {[
            { value: count, label: "Lectures explored" },
            {
              value: `${(watchSeconds / 3600).toFixed(1)}h`,
              label: "Time in your learning space",
            },
            { value: xp, label: "Existing learning points" },
          ].map((stat) => (
            <div className="library-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
        <section className="profile-account">
          <div>
            <h2>Keep your curiosity close.</h2>
            <p>Return to your study sets, or begin with something new.</p>
          </div>
          <div className="profile-actions">
            <Link className="button" href="/history">
              <Icon name="book" size={16} />
              My library
            </Link>
            <Link className="button button-outline" href="/dashboard">
              Keep learning
              <Icon name="arrow" size={16} />
            </Link>
            {session && (
              <button
                className="button button-outline"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            )}
          </div>
        </section>
        <Link href="/leaderboard" className="legacy-link">
          View existing learning records
          <Icon name="arrow" size={14} />
        </Link>
      </main>
      <footer className="app-footer">
        <span>A little smarter, every time.</span>
        <span>prepify. Your ideas, your pace.</span>
      </footer>
    </div>
  );
}
