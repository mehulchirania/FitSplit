"use client";

import { FirebaseError } from "firebase/app";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent, MouseEvent } from "react";
import { Activity, Dumbbell, Mail, Menu, UsersRound, X } from "@/components/icons";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";
import { submitContactMessage } from "@/lib/firebase/actions";
import type { FormActionState } from "@/types/action-state";

const initialContactState: FormActionState = {
  status: "idle",
  message: ""
};

const trainerItems = [
  "Create and manage workout programs",
  "Assign members to plans by trainer",
  "Review training activity and lift logs",
  "Inbox messaging and training signals",
  "Injury notes visible to coaches",
  "Role-based staff access"
];

const memberItems = [
  "View today's assigned workout",
  "Start workouts from the app",
  "Log sets, reps, and weights",
  "Track lift history and progress",
  "Simple mobile-first interface"
];

const previewStats = [
  ["Live check-ins", "18 active now"],
  ["PPL x2 assigned", "6 day split"],
  ["Members by trainer", "5 updates today"],
  ["Weekly consistency", "86% completion"]
];

function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)) {
      return "Invalid login details.";
    }

    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a minute and try again.";
    }
  }

  return "Unable to sign in. Please try again.";
}

function LogoMark({ size = "normal" }: { size?: "normal" | "large" }) {
  return (
    <span className={`fs3-logo-mark ${size === "large" ? "fs3-logo-mark-large" : ""}`} aria-hidden="true">
      <img alt="" className="theme-logo-dark" src="/fitsplit-logo-dark.png" />
      <img alt="" className="theme-logo-light" src="/fitsplit-logo-light.png" />
    </span>
  );
}

function LoginModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"member" | "staff">("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isMember = mode === "member";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function switchMode(nextMode: "member" | "staff") {
    setMode(nextMode);
    setUsername("");
    setPassword("");
    setError("");
    setMessage("");
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError(isMember ? "Enter your mobile number or email." : "Enter your username.");
      return;
    }

    if (isMember && !/^\d{4}$/.test(cleanPassword)) {
      setError("PIN must be exactly 4 numeric digits.");
      return;
    }

    if (!isMember && !cleanPassword) {
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

  function handleForgotPassword() {
    setError("");
    setMessage("");

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(isMember ? "Enter your mobile number or email first." : "Enter your username first.");
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
    <div className="fs3-modal-backdrop" onMouseDown={handleBackdropClick}>
      <section className="fs3-login-modal" aria-label="Login modal" role="dialog" aria-modal="true">
        <button className="fs3-modal-close" aria-label="Close login" onClick={onClose} type="button">
          <X />
        </button>
        <div className="fs3-modal-heading">
          <LogoMark />
          <h2>Access your workspace</h2>
        </div>

        <div className="fs3-login-tabs" role="tablist" aria-label="Login type">
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
          className="fs3-login-form"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <label>
            <span>{isMember ? "Mobile number or email" : "Username"}</span>
            <input
              autoComplete="username"
              inputMode={isMember ? "email" : undefined}
              onChange={(event) => setUsername(event.target.value)}
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
              onChange={(event) =>
                setPassword(isMember ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value)
              }
              pattern={isMember ? "\\d{4}" : undefined}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="fs3-login-error">{error}</p> : null}
          {message ? <p className="fs3-login-success">{message}</p> : null}

          <button className="fs3-button fs3-button-primary fs3-full-button" disabled={isPending} type="submit">
            {isPending ? "Logging in..." : "Log in"}
          </button>
          <button
            className="fs3-forgot-button"
            disabled={isPending}
            onClick={handleForgotPassword}
            type="button"
          >
            Forgot password?
          </button>
        </form>

        {isMember ? <p className="fs3-helper">Use your registered mobile/email and 4-digit PIN.</p> : null}
        <p className="fs3-modal-note">Built for gym teams to manage workouts, members, and progress from one workspace.</p>
      </section>
    </div>
  );
}

export function LandingPageClient() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [contactState, contactAction, isContactPending] = useActionState(submitContactMessage, initialContactState);

  function openLogin() {
    setIsMenuOpen(false);
    setIsLoginOpen(true);
  }

  return (
    <main className="fs3-landing" id="top">
      <header className="fs3-navbar">
        <a className="fs3-brand" href="#top" aria-label="FitSplit home">
          <LogoMark />
          <span>FitSplit</span>
        </a>

        <nav className={`fs3-nav-links ${isMenuOpen ? "is-open" : ""}`} aria-label="Landing navigation">
          <a href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
          <a href="#partners" onClick={() => setIsMenuOpen(false)}>Partners</a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
        </nav>

        <div className="fs3-nav-actions">
          <button
            className="fs3-menu-button"
            aria-expanded={isMenuOpen}
            aria-label="Open navigation menu"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <Menu />
          </button>
          <button className="fs3-button fs3-button-primary" onClick={openLogin} type="button">
            Login
          </button>
        </div>
      </header>

      <section className="fs3-hero">
        <div className="fs3-hero-copy">
          <p className="fs3-eyebrow">Workout management for gyms</p>
          <h1>Train members with clarity, consistency, and control.</h1>
          <p>
            FitSplit gives gym owners and trainers one workspace to create plans, assign members,
            and track progress from one clean workspace.
          </p>
          <div className="fs3-hero-actions">
            <a className="fs3-text-link" href="#features">
              See how it works <span aria-hidden="true">-&gt;</span>
            </a>
          </div>
        </div>

        <article className="fs3-product-card" aria-label="Trainer command preview">
          <div className="fs3-card-topline">
            <span>Trainer Command</span>
            <em>Live</em>
          </div>
          <div className="fs3-stat-grid">
            <div>
              <span>Active members</span>
              <strong>38</strong>
            </div>
            <div>
              <span>Plans assigned</span>
              <strong>24</strong>
            </div>
            <div>
              <span>Training now</span>
              <strong>18</strong>
            </div>
          </div>
          <div className="fs3-plan-preview">
            <span>Today's plan</span>
            <strong>Push Strength</strong>
            <p>Incline press / shoulder press / triceps</p>
          </div>
        </article>
      </section>

      <section className="fs3-section fs3-how">
        <div className="fs3-section-heading">
          <h2>Built around how gyms actually work.</h2>
        </div>
        <div className="fs3-step-grid">
          <article>
            <Dumbbell />
            <span>Step 1</span>
            <h3>Create</h3>
            <p>Build structured workout plans with exercises, sets, and progressions</p>
          </article>
          <article>
            <UsersRound />
            <span>Step 2</span>
            <h3>Assign</h3>
            <p>Assign plans to individual members or groups in seconds</p>
          </article>
          <article>
            <Activity />
            <span>Step 3</span>
            <h3>Track</h3>
            <p>Review lift logs, workout activity, and member progress in one view</p>
          </article>
        </div>
      </section>

      <section className="fs3-section fs3-features" id="features">
        <div className="fs3-section-heading">
          <h2>Everything important, grouped by how gyms actually work.</h2>
        </div>
        <div className="fs3-feature-columns">
          <article>
            <div className="fs3-feature-title">
              <UsersRound />
              <h3>For Trainers & Owners</h3>
            </div>
            <ul>
              {trainerItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article>
            <div className="fs3-feature-title">
              <Dumbbell />
              <h3>For Members</h3>
            </div>
            <ul>
              {memberItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </div>
        <div className="fs3-preview-row">
          {previewStats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="fs3-section fs3-partners" id="partners">
        <div className="fs3-section-heading">
          <h2>Trusted by focused fitness communities.</h2>
        </div>
        <article className="fs3-partner-card">
          <img alt="Sri Shakthi Hanuman Gym logo" src="/shg-gym-logo.jpeg" />
          <div>
            <h3>Sri Shakthi Hanuman Gym</h3>
            <blockquote>
              "FitSplit simplified how our trainers assign and track workouts across all our members."
            </blockquote>
            <p>Gym Manager, Sri Shakthi Hanuman Gym</p>
          </div>
        </article>
      </section>

      <footer className="fs3-footer" id="contact">
        <div className="fs3-footer-brand">
          <div className="fs3-brand">
            <LogoMark />
            <span>FitSplit</span>
          </div>
          <p>Workout delivery, member progress, and trainer coordination in one focused workspace.</p>
        </div>

        <div className="fs3-footer-stats" aria-label="FitSplit proof points">
          <div><strong>86%</strong><span>weekly workout completion visibility</span></div>
          <div><strong>2 min</strong><span>average time to assign a plan</span></div>
          <div><strong>1</strong><span>workspace for trainers, members, and admins</span></div>
        </div>

        <form action={contactAction} className="fs3-footer-contact">
          <input name="source" type="hidden" value="footer-compact" />
          <label>Want FitSplit for your gym?</label>
          <input name="email" placeholder="Email address" required type="email" />
          <textarea name="body" placeholder="Message" required rows={3} />
          {contactState.status === "error" ? <p className="fs3-form-error">{contactState.message}</p> : null}
          {contactState.status === "success" ? <p className="fs3-form-success">{contactState.message}</p> : null}
          <button className="fs3-button fs3-button-primary" disabled={isContactPending} type="submit">
            {isContactPending ? "Sending..." : "Send Message"}
          </button>
        </form>

        <div className="fs3-bottom-bar">
          <span>© FitSplit · fitsplit.in</span>
          <a href="mailto:hello@fitsplit.in"><Mail /> hello@fitsplit.in</a>
        </div>
      </footer>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </main>
  );
}
