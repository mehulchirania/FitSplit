"use client";

import { FirebaseError } from "firebase/app";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

function authErrMsg(err: unknown) {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(err.code))
      return "Invalid login details.";
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  }
  return "Unable to sign in. Please try again.";
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"member" | "staff">("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isPending, start] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const isMember = mode === "member";

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

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

  if (!open) return null;

  return (
    <div className="lp-modal-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="lp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lp-modal__head">
          <span className="lp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="FitSplit" style={{ height: 28 }} />
            <span style={{ fontSize: 16 }}>FitSplit</span>
          </span>
          <button type="button" className="lp-modal__close" onClick={onClose} aria-label="Close login dialog">
            ✕
          </button>
        </div>

        <h2 className="lp-modal__title" id="lp-login-title">
          Welcome back.
        </h2>
        <p className="lp-modal__sub">
          {isMember
            ? "Sign in with your mobile number or username and 4-digit PIN."
            : "Trainers and owners sign in with username and password."}
        </p>

        <div className="lp-modal__tabs" role="tablist" aria-label="Login type">
          <button
            type="button"
            role="tab"
            aria-selected={isMember}
            className="lp-modal__tab"
            onClick={() => switchMode("member")}
          >
            Member
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isMember}
            className="lp-modal__tab"
            onClick={() => switchMode("staff")}
          >
            Staff
          </button>
        </div>

        <form className="lp-modal__form" onSubmit={onSubmit}>
          <div className="lp-field">
            <label htmlFor="lp-login-user">{isMember ? "Mobile number or username" : "Username"}</label>
            <input
              id="lp-login-user"
              ref={firstFieldRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="lp-field">
            <label htmlFor="lp-login-pass">{isMember ? "4-digit PIN" : "Password"}</label>
            <input
              id="lp-login-pass"
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
            <p className="lp-form__error" role="alert">
              {error}
            </p>
          )}

          {resetConfirmOpen ? (
            <div className="lp-modal__confirm">
              <p>
                {isMember
                  ? "A reset request will be sent to the gym owner. They will share your new PIN with you."
                  : "A reset request will be sent to the gym owner and admin."}
              </p>
              <div className="lp-modal__confirm-actions">
                <button type="button" className="lp-btn lp-btn--primary" onClick={onConfirmReset} disabled={isPending}>
                  {isPending ? "Sending…" : "Request reset"}
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost"
                  onClick={() => setResetConfirmOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="submit" className="lp-btn lp-btn--primary" disabled={isPending}>
                {isPending ? "Logging in…" : "Log in"}
              </button>
              <button type="button" className="lp-modal__forgot" onClick={onForgotClick} disabled={isPending}>
                {isMember ? "Forgot PIN?" : "Forgot password?"}
              </button>
            </>
          )}
        </form>

        <p className="lp-modal__footnote">Secure access for members, trainers &amp; gym owners.</p>
      </div>
    </div>
  );
}
