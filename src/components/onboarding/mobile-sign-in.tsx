"use client";

import { FirebaseError } from "firebase/app";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

// Full-screen mobile presentation of sign-in. Deliberately duplicates the
// form logic in src/components/landing/login-modal.tsx rather than importing
// it — the modal is desktop chrome (overlay, focus trap, close button) that
// does not translate to a full screen. Auth calls (loginWithCredentials,
// requestPasswordReset) are the same functions from src/lib/auth.ts; nothing
// about authentication itself changes here, only presentation.

function authErrMsg(err: unknown) {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(err.code))
      return "Invalid login details.";
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  }
  return "Unable to sign in. Please try again.";
}

export function MobileSignIn({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<"member" | "staff">("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isPending, start] = useTransition();
  const isMember = mode === "member";

  function switchMode(next: "member" | "staff") {
    setMode(next);
    setUsername("");
    setPassword("");
    setError("");
    setResetConfirmOpen(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password.trim();
    if (!u) {
      setError(isMember ? "Enter your mobile number or username." : "Enter your username.");
      return;
    }
    if (isMember && !/^\d{4}$/.test(p)) {
      setError("PIN must be exactly 4 numeric digits.");
      return;
    }
    if (!isMember && !p) {
      setError("Enter your password.");
      return;
    }

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("username", u);
        fd.set("password", p);
        fd.set("mode", mode);
        const session = await loginWithCredentials(fd);
        if (session.status !== "success") {
          setError(session.message);
          return;
        }
        window.scrollTo(0, 0);
        window.localStorage.setItem("fitsplit-session-start", String(Date.now()));
        window.location.replace(session.redirectUrl);
      } catch (err) {
        setError(authErrMsg(err));
      }
    });
  }

  function onForgotClick() {
    setError("");
    if (!username.trim()) {
      setError(isMember ? "Enter your mobile number or username first." : "Enter your username first.");
      return;
    }
    setResetConfirmOpen(true);
  }

  function onConfirmReset() {
    start(async () => {
      const fd = new FormData();
      fd.set("username", username.trim());
      fd.set("mode", mode);
      const result = await requestPasswordReset(fd);
      if (result.status === "success") {
        toast.success(result.message);
        setResetConfirmOpen(false);
      } else {
        setError(result.message);
        setResetConfirmOpen(false);
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
        <p className="msi-sub">
          {isMember
            ? "Sign in with your mobile number or username and 4-digit PIN."
            : "Trainers and owners sign in with username and password."}
        </p>

        <div className="msi-tabs" role="tablist" aria-label="Login type">
          <button
            type="button"
            role="tab"
            aria-selected={isMember}
            className="msi-tab"
            onClick={() => switchMode("member")}
          >
            Member
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isMember}
            className="msi-tab"
            onClick={() => switchMode("staff")}
          >
            Staff
          </button>
        </div>

        <form className="msi-form" onSubmit={onSubmit}>
          <div className="msi-field">
            <label htmlFor="msi-user">{isMember ? "Mobile number or username" : "Username"}</label>
            <input
              id="msi-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="msi-field">
            <label htmlFor="msi-pass">{isMember ? "4-digit PIN" : "Password"}</label>
            <input
              id="msi-pass"
              type="password"
              autoComplete={isMember ? "one-time-code" : "current-password"}
              inputMode={isMember ? "numeric" : undefined}
              maxLength={isMember ? 4 : undefined}
              value={password}
              onChange={(e) =>
                setPassword(isMember ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isPending && !resetConfirmOpen) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </div>

          {error && (
            <p className="msi-error" role="alert">
              {error}
            </p>
          )}

          {resetConfirmOpen ? (
            <div className="msi-confirm">
              <p>
                {isMember
                  ? "A reset request will be sent to the gym owner. They will share your new PIN with you."
                  : "A reset request will be sent to the gym owner and admin."}
              </p>
              <div className="msi-confirm-actions">
                <button type="button" className="button button-primary" onClick={onConfirmReset} disabled={isPending}>
                  {isPending ? "Sending…" : "Request reset"}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setResetConfirmOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="msi-actions">
              <button type="submit" className="button button-primary msi-submit" disabled={isPending}>
                {isPending ? "Logging in…" : "Log in"}
              </button>
              <button type="button" className="msi-forgot" onClick={onForgotClick} disabled={isPending}>
                {isMember ? "Forgot PIN?" : "Forgot password?"}
              </button>
            </div>
          )}
        </form>
      </div>

      <p className="msi-footnote">Secure access for members, trainers &amp; gym owners.</p>
    </div>
  );
}
