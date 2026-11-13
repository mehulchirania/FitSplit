"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

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
        <p className="lp-modal__sub">Sign in with your email and password.</p>

        <form className="lp-modal__form" onSubmit={onSubmit}>
          <div className="lp-field">
            <label htmlFor="lp-login-user">Email</label>
            <input
              id="lp-login-user"
              ref={firstFieldRef}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="lp-field">
            <label htmlFor="lp-login-pass">Password</label>
            <input
              id="lp-login-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="lp-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="lp-btn lp-btn--primary" disabled={isPending}>
            {isPending ? "Logging in…" : "Log in"}
          </button>
          <button type="button" className="lp-modal__forgot" onClick={onForgotClick} disabled={isPending}>
            Forgot password?
          </button>
        </form>

        <p className="lp-modal__footnote">
          New here? <Link href="/signup">Create a free account</Link>
        </p>
      </div>
    </div>
  );
}
