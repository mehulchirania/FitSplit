"use client";

import { FirebaseError } from "firebase/app";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createLocalDemoSession, createSession, resolveLoginIdentifier } from "@/lib/auth";
import { getFirebaseClientServices } from "@/lib/firebase/client";

function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)) {
      return "Invalid username or password.";
    }

    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a minute and try again.";
    }
  }

  return "Unable to sign in. Please try again.";
}

type LoginMode = "member" | "staff";

export function LoginForm() {
  const [mode, setMode] = useState<LoginMode>("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const isMember = mode === "member";

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode);
    setUsername("");
    setPassword("");
    setError("");
    setMessage("");
  }

  function handleLoginKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.tagName === "TEXTAREA") {
      return;
    }

    event.preventDefault();
    loginButtonRef.current?.click();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const resolved = await resolveLoginIdentifier(username, mode);

        if (resolved.status !== "success") {
          setError(resolved.message);
          return;
        }

        if (resolved.localOnly) {
          const session = await createLocalDemoSession(username, password, mode);

          if (session.status !== "success") {
            setError(session.message);
            return;
          }

          router.push(session.redirectUrl);
          router.refresh();
          return;
        }

        const { auth } = getFirebaseClientServices();
        const credential = await signInWithEmailAndPassword(auth, resolved.email, password);
        const idToken = await credential.user.getIdToken(true);
        const session = await createSession(idToken);

        if (session.status !== "success") {
          setError(session.message);
          return;
        }

        router.push(session.redirectUrl);
        router.refresh();
      } catch (caughtError) {
        setError(authErrorMessage(caughtError));
      }
    });
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const resolved = await resolveLoginIdentifier(username, mode);

        if (resolved.status !== "success") {
          setError(resolved.message);
          return;
        }

        const { auth } = getFirebaseClientServices();
        await sendPasswordResetEmail(auth, resolved.email);
        setMessage("Password reset email sent.");
      } catch (caughtError) {
        setError(authErrorMessage(caughtError));
      }
    });
  }

  return (
    <section className="login-shell" aria-label="FitSplit login">
      <div className="login-brand-panel">
        <img alt="FitSplit" className="login-logo" src="/icon-512.png" />
        <p className="eyebrow">FitSplit</p>
        <h1>Your fitness companion</h1>
        <p>
          Members get their assigned workout for the day. Owners manage people,
          plans, and gym activity from one calm workspace.
        </p>
        <div className="login-demo-strip">
          <span>Local demo</span>
          <strong>{isMember ? "9688227039 / 123456" : "admin / password"}</strong>
        </div>
      </div>

      <div className="login-card">
        <div className="login-card-header">
          <p className="eyebrow">{isMember ? "Member access" : "Staff access"}</p>
          <h2>{isMember ? "Member Login" : "Staff Login"}</h2>
          <p>
            {isMember
              ? "Use your registered mobile number and PIN."
              : "Admin and gym owner accounts sign in here."}
          </p>
        </div>

        <div className="login-segment" role="tablist" aria-label="Login type">
          <button
            aria-selected={isMember}
            className={isMember ? "is-active" : ""}
            onClick={() => switchMode("member")}
            role="tab"
            type="button"
          >
            Member
          </button>
          <button
            aria-selected={!isMember}
            className={!isMember ? "is-active" : ""}
            onClick={() => switchMode("staff")}
            role="tab"
            type="button"
          >
            Staff
          </button>
        </div>

        <form className="login-form" onKeyDown={handleLoginKeyDown} onSubmit={handleSubmit}>
          <label>
            <span>{isMember ? "Mobile number or username" : "Email or username"}</span>
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder={isMember ? "9688227039" : "admin"}
              required
              type="text"
              value={username}
            />
          </label>

          <label>
            <span>{isMember ? "6-digit PIN" : "Password"}</span>
            <input
              autoComplete="current-password"
              inputMode={isMember ? "numeric" : undefined}
              maxLength={isMember ? 6 : undefined}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isMember ? "123456" : "password"}
              required
              type={isMember ? "tel" : "password"}
              value={password}
            />
          </label>

          {error ? <div className="login-message error">{error}</div> : null}
          {message ? <div className="login-message success">{message}</div> : null}

          <button className="button button-primary login-submit" disabled={isPending} ref={loginButtonRef} type="submit">
            {isPending ? "Logging in..." : "Log in"}
          </button>

          {!isMember ? (
            <button
              className="login-link-button"
              disabled={isPending || !username.trim()}
              onClick={handleForgotPassword}
              type="button"
            >
              Forgot password?
            </button>
          ) : null}
        </form>
      </div>
    </section>
  );
}
