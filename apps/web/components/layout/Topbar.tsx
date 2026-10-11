"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface CurrentUser {
  username: string;
}

export function TopNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          setUser(null);
          return;
        }

        const profile = (await response.json()) as CurrentUser;
        setUser(profile);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSessionChecked(true);
        }
      });

    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      setUser(null);
      window.location.assign("/signup");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Logout failed. Please try again.",
      );
      setLoggingOut(false);
    }
  };

  return (
    <nav className={`top${user ? " authenticated-nav" : ""}`}>
      <Link href="/" className="logo">
        <i />
        FLOWFORGE AI
      </Link>
      <div className="tabs">
        <Link className="tab" href="/">
          Overview
        </Link>
        {user && (
          <>
            <Link className="tab" href="/dashboard">
              Dashboard
            </Link>
            <Link className="tab" href="/workflows/demo">
              Workflow builder
            </Link>
          </>
        )}
      </div>
      <div className="sp" />
      {sessionChecked &&
        (user ? (
          <>
            <span className="tab" aria-label="Signed in user">
              {user.username}
            </span>
            <button
              className="tab logout"
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </>
        ) : (
          <Link className="tab" href="/signup">
            Sign up
          </Link>
        ))}
      {logoutError && (
        <span className="logout-error" role="alert">
          {logoutError}
        </span>
      )}
      <div className="stat">
        <b />
        SYSTEM ONLINE · AI CORE ACTIVE
      </div>
    </nav>
  );
}
