"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

// Full-screen mobile presentation of sign-in. Deliberately duplicates the
// form logic in src/components/landing/login-modal.tsx rather than importing
// it: the modal is desktop chrome (overlay, focus trap, close button) that
// does not translate to a full screen. Auth calls are the same server actions
// from src/lib/auth.ts; only presentation differs.

export function MobileSignIn({ onBack }: { onBack?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const u = email.trim();
    if (!u) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("email", u);
        fd.set("password", password);
        fd.set("rememberMe", "true");
        window.localStorage.setItem("fitsplit-remember-me", "true");
        const session = await loginWithCredentials(fd);
        if (session.status !== "success") {
          setError(session.message);
          return;
        }
        window.scrollTo(0, 0);
        window.localStorage.setItem("fitsplit-session-start", String(Date.now()));
        window.location.replace(session.redirectUrl);
      } catch (err) {
        console.error(err);
        setError("Unable to sign in. Please try again.");
      }
    });
  }

  function onForgotClick() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("email", email.trim());
      const result = await requestPasswordReset(fd);
      if (result.status === "success") {
        toast.success(result.message);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="msi-screen">
      <div className="msi-head">
        {onBack ? (
          <button type="button" className="msi-back" onClick={onBack} aria-label="Back">
            ←
          </button>
        ) : (
          <span />
        )}
        <span className="msi-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="" style={{ height: 26 }} />
          FitSplit
        </span>
        <span />
      </div>

      <div className="msi-body">
        <h1 className="msi-title">Welcome back.</h1>
        <p className="msi-sub">Sign in with your email and password.</p>

        <form className="msi-form" onSubmit={onSubmit}>
          <div className="msi-field">
            <label htmlFor="msi-user">Email</label>
            <input
              id="msi-user"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="msi-field">
            <label htmlFor="msi-pass">Password</label>
            <input
              id="msi-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="msi-error" role="alert">
              {error}
            </p>
          )}

          <div className="msi-actions">
            <button type="submit" className="button button-primary msi-submit" disabled={isPending}>
              {isPending ? "Logging in…" : "Log in"}
            </button>
            <button type="button" className="msi-forgot" onClick={onForgotClick} disabled={isPending}>
              Forgot password?
            </button>
          </div>
        </form>
      </div>

      <p className="msi-footnote">
        New here? <Link href="/signup">Create a free account</Link>
      </p>
    </div>
  );
}
