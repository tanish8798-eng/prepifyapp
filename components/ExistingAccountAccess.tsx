"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import AppNav from "@/components/AppNav";
import Icon from "@/components/Icon";
import NeonCore from "@/components/NeonCore";

export default function ExistingAccountAccess({
  signup = false,
}: {
  signup?: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [providers, setProviders] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/providers", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) =>
        setProviders(
          Object.keys(data).filter(
            (key) => key === "google" || key === "github",
          ),
        ),
      )
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);
  const oauth = async (provider: string) => {
    setLoading(provider);
    setError("");
    try {
      const result = await signIn(provider, {
        callbackUrl: "/dashboard",
        redirect: false,
      });
      if (result?.error) throw new Error();
      if (result?.url) {
        window.location.assign(result.url);
        return;
      }
    } catch {
      setError(
        "Sign-in couldn’t connect. You can keep learning without an account.",
      );
    }
    setLoading(null);
  };
  return (
    <div className="app-shell">
      <AppNav active="home" />
      <main id="main-content" className="account-main">
        <section className="account-card">
          <NeonCore size={112} icon="spark" />
          <p className="eyebrow">YOUR CURIOSITY IS ALWAYS WELCOME</p>
          <h1>
            {signup ? "A good place to begin." : "Pick up where you left off."}
          </h1>
          <p>
            You don’t need an account to learn with Prepify. Your existing
            sign-in options are here if you want them.
          </p>
          <Link href="/dashboard" className="button">
            Keep learning as a guest
            <Icon name="arrow" size={17} />
          </Link>
          <div className="account-divider">
            <span>or use your existing account</span>
          </div>
          {checking ? (
            <p role="status">
              <span className="spinner" />
              Checking sign-in options…
            </p>
          ) : providers.length ? (
            <div className="account-providers">
              {providers.map((provider) => (
                <button
                  className="button button-outline"
                  key={provider}
                  disabled={loading !== null}
                  onClick={() => oauth(provider)}
                >
                  {loading === provider ? (
                    <span className="spinner" />
                  ) : (
                    <Icon name="link" size={17} />
                  )}
                  Continue with {provider === "google" ? "Google" : "GitHub"}
                </button>
              ))}
            </div>
          ) : (
            <p className="account-hint">
              Account sign-in isn’t configured in this environment. The full
              learning experience is available to guests.
            </p>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <p className="account-switch">
            {signup
              ? "Already have an account?"
              : "Looking for account access?"}{" "}
            <Link href={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "View options"}
            </Link>
          </p>
        </section>
      </main>
      <footer className="app-footer">
        <span>Less friction. More learning.</span>
        <span>prepify. Follow your curiosity.</span>
      </footer>
    </div>
  );
}
