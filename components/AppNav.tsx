import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import Icon from "@/components/Icon";

type AppNavProps = {
  active: "dashboard" | "history" | "leaderboard" | "profile" | "home";
  xp?: number;
  streak?: number;
  dailyUsed?: number;
  dailyLimit?: number;
  avatarLabel?: string;
};

export default function AppNav({ active, dailyUsed, dailyLimit }: AppNavProps) {
  return (
    <header className="app-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <nav className="app-nav" aria-label="Main navigation">
        <Link href="/" aria-label="Prepify home">
          <BrandMark size={35} />
        </Link>
        <div className="nav-links">
          <Link
            href="/dashboard"
            className={active === "dashboard" ? "nav-link active" : "nav-link"}
            aria-current={active === "dashboard" ? "page" : undefined}
          >
            <Icon name="spark" size={17} />
            Learn
          </Link>
          <Link
            href="/history"
            className={active === "history" ? "nav-link active" : "nav-link"}
            aria-current={active === "history" ? "page" : undefined}
          >
            <Icon name="book" size={17} />
            My library
          </Link>
        </div>
        <div className="nav-end">
          {typeof dailyUsed === "number" && typeof dailyLimit === "number" ? (
            <span
              className="usage-chip"
              title="Your existing daily generation allowance"
            >
              <span className="status-dot" />
              {Math.max(0, dailyLimit - dailyUsed)} / {dailyLimit} sets left
              today
            </span>
          ) : (
            <span className="nav-tagline">
              A little clarity goes a long way.
            </span>
          )}
          {active === "home" && (
            <Link className="button button-small" href="/dashboard">
              Start learning
              <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
