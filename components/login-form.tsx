"use client";

import { FirebaseError } from "firebase/app";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const usernamePattern = /^[a-z0-9._-]{3,}$/i;
const pinPattern = /^\d{4}$/;

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
  const formRef = useRef<HTMLFormElement>(null);

  const isMember = mode === "member";
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!cleanUsername) {
      setError(isMember ? "Enter your username, registered mobile number, or email." : "Enter your staff email or username.");
      return;
    }

    if (isMember) {
      const normalizedPhone = cleanUsername.replace(/[\s-]/g, "");
      const isValidMemberIdentifier =
        emailPattern.test(cleanUsername.toLowerCase()) ||
        phonePattern.test(normalizedPhone) ||
        usernamePattern.test(cleanUsername);

      if (!isValidMemberIdentifier) {
        setError("Use a valid email, Indian mobile number, or username for member login.");
        return;
      }

      if (!pinPattern.test(cleanPassword)) {
        setError("PIN must be exactly 4 numeric digits.");
        return;
      }
    } else if (!cleanPassword) {
      setError("Enter your password.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("username", cleanUsername);
        formData.set("password", cleanPassword);
        formData.set("mode", mode);
        const session = await loginWithCredentials(formData);

        if (session.status !== "success") {
          setError(session.message);
          return;
        }

        window.scrollTo(0, 0);
        window.localStorage.setItem("fitsplit-session-start", String(Date.now()));
        window.location.replace(session.redirectUrl);
      } catch (caughtError) {
        setError(authErrorMessage(caughtError));
      }
    });
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    if (!cleanUsername) {
      setError(isMember ? "Enter your username, mobile number, or email first." : "Enter your username first.");
      return;
    }

    const prompt = isMember
      ? "A password reset request will be sent to the gym owner. Please contact them for the new PIN."
      : "A password reset request will be sent to the gym owner and admin.";

    if (!window.confirm(prompt)) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", cleanUsername);
      formData.set("mode", mode);
      const result = await requestPasswordReset(formData);

      if (result.status === "success") {
        setMessage(result.message);
        window.alert(result.message);
      } else {
        setError(result.message);
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
          <strong>{isMember ? "username/mobile/email / 1234" : "admin / password"}</strong>
        </div>
      </div>

      <div className="login-card">
        <div className="login-card-header">
          <p className="eyebrow">{isMember ? "Member access" : "Staff access"}</p>
          <h2>{isMember ? "Member Login" : "Staff Login"}</h2>
          <p>
            {isMember
              ? "Use your member username, mobile number, or email with your PIN."
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

        <form
          className="login-form"
          onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <label>
            <span>{isMember ? "Username, mobile number, or email" : "Email or username"}</span>
            <input
              autoComplete="username"
              inputMode={isMember ? "tel" : undefined}
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder={isMember ? "Member username" : "admin"}
              required
              type="text"
              value={username}
            />
          </label>

          <label>
            <span>{isMember ? "4-digit PIN" : "Password"}</span>
            <input
              autoComplete={isMember ? "one-time-code" : "current-password"}
              inputMode={isMember ? "numeric" : undefined}
              maxLength={isMember ? 4 : undefined}
              name="password"
              onChange={(event) =>
                setPassword(isMember ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value)
              }
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              pattern={isMember ? "\\d{4}" : undefined}
              placeholder={isMember ? "1234" : "password"}
              required
              type={isMember ? "password" : "password"}
              value={password}
            />
          </label>

          {error ? <div className="login-message error">{error}</div> : null}
          {message ? <div className="login-message success">{message}</div> : null}

          <button
            className="button button-primary login-submit"
            disabled={isPending}
            onClick={() => formRef.current?.requestSubmit()}
            type="button"
          >
            {isPending ? "Logging in..." : "Log in"}
          </button>

          <button
            className="login-link-button"
            disabled={isPending || !username.trim()}
            onClick={handleForgotPassword}
            type="button"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </section>
  );
}
