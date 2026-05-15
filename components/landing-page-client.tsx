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

const valueCards = [
  {
    title: "Assign workouts faster",
    body: "Pick a saved split, select a member, and keep training delivery consistent."
  },
  {
    title: "Keep training structured",
    body: "Members get a clear weekly plan instead of scattered notes and chat messages."
  },
  {
    title: "Reduce trainer confusion",
    body: "Owners and trainers work from the same exercise catalog, programs, and member records."
  },
  {
    title: "Give members a cleaner app",
    body: "Today's workout, exercises, and lift logging stay focused on what they need in the gym."
  }
];

const workflowSteps = [
  ["Create plans", "Build reusable workout splits from your exercise catalog."],
  ["Assign members", "Choose the right plan for an individual member in seconds."],
  ["Members follow workouts", "Members open their app and follow the day's assigned training."],
  ["Track progress", "Review lift logs, completion signals, and training history clearly."]
];

const audienceCards = [
  "Independent gyms",
  "Personal trainers",
  "Strength gyms",
  "Semi-personal training setups"
];

const previewCards = [
  {
    body: "Trainer selects a member and applies a saved workout split.",
    title: "Assign workouts in seconds",
    type: "assignment"
  },
  {
    body: "A clean mobile workout view for today's exercises.",
    title: "Members see only what matters",
    type: "mobile"
  },
  {
    body: "Lift history keeps progressive overload visible.",
    title: "Track progress clearly",
    type: "progress"
  },
  {
    body: "Simple action lists help owners see who needs a plan.",
    title: "Built for real gyms",
    type: "owner"
  }
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
          <h1>Deliver structured workouts to every member.</h1>
          <p>
            FitSplit helps gyms assign plans, guide members, and track training progress without
            complicated systems.
          </p>
          <div className="fs3-hero-actions">
            <button className="fs3-button fs3-button-primary" onClick={openLogin} type="button">
              Login
            </button>
            <a className="fs3-text-link" href="#features">
              See how it works <span aria-hidden="true">-&gt;</span>
            </a>
          </div>
        </div>

        <article className="fs3-hero-mockup" aria-label="Workout assignment preview">
          <div className="fs3-mockup-toolbar">
            <span>Assign workout</span>
            <em>Trainer workspace</em>
          </div>
          <div className="fs3-assignment-panel">
            <div>
              <span>Member</span>
              <strong>Rahul Sharma</strong>
              <small>Goal: Muscle gain</small>
            </div>
            <div>
              <span>Workout split</span>
              <strong>PPL Upper Lower</strong>
              <small>Structured weekly plan</small>
            </div>
          </div>
          <div className="fs3-day-preview">
            <span>Today's workout</span>
            <h3>Push Strength</h3>
            <ul>
              <li>Incline dumbbell press</li>
              <li>Shoulder press</li>
              <li>Triceps rope pushdown</li>
            </ul>
          </div>
        </article>
      </section>

      <section className="fs3-section fs3-value">
        <div className="fs3-section-heading">
          <p className="fs3-eyebrow">Why gyms use FitSplit</p>
          <h2>Simple workout delivery for real training floors.</h2>
          <p>FitSplit keeps plans, members, and progress in one focused system for the people running training.</p>
        </div>
        <div className="fs3-value-grid">
          {valueCards.map((card) => (
            <article key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fs3-section fs3-how" id="features">
        <div className="fs3-section-heading">
          <p className="fs3-eyebrow">How it works</p>
          <h2>From trainer plan to member workout in four clear steps.</h2>
        </div>
        <div className="fs3-step-grid">
          {workflowSteps.map(([title, body], index) => (
            <article key={title}>
              {index === 0 ? <Dumbbell /> : index === 1 ? <UsersRound /> : <Activity />}
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fs3-section fs3-audience">
        <div className="fs3-section-heading">
          <p className="fs3-eyebrow">Who it is for</p>
          <h2>Made for gyms that deliver coaching, not just access.</h2>
        </div>
        <div className="fs3-audience-grid">
          {audienceCards.map((item) => (
            <article key={item}>{item}</article>
          ))}
        </div>
      </section>

      <section className="fs3-section fs3-previews">
        <div className="fs3-section-heading">
          <p className="fs3-eyebrow">Product workflows</p>
          <h2>Clean screens for the moments that matter.</h2>
        </div>
        <div className="fs3-preview-grid">
          {previewCards.map((card) => (
            <article className={`fs3-workflow-card fs3-workflow-${card.type}`} key={card.title}>
              <div className="fs3-mini-screen" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fs3-section fs3-partners" id="partners">
        <div className="fs3-section-heading">
          <p className="fs3-eyebrow">Partners</p>
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
          <p>Workout delivery, member progress, and trainer coordination in one focused workspace for gyms.</p>
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
