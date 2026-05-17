"use client";

import { FirebaseError } from "firebase/app";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";
import { submitContactMessage } from "@/lib/firebase/actions";
import type { FormActionState } from "@/types/action-state";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Data ─────────────────────────────────────────────────────────────────────

const initialContactState: FormActionState = { status: "idle", message: "" };

const featureCards = [
  {
    icon: "zap",
    title: "Assign workouts faster",
    body: "Pick a saved split, select a member, and keep training delivery consistent across your whole roster.",
  },
  {
    icon: "grid",
    title: "Keep training structured",
    body: "Members get a clear weekly plan instead of scattered notes and chat messages.",
  },
  {
    icon: "users",
    title: "Reduce trainer confusion",
    body: "Owners and trainers work from the same exercise catalog, programs, and member records.",
  },
  {
    icon: "phone",
    title: "Give members a cleaner app",
    body: "Today's workout, exercises, and lift logging - focused on what they need in the gym.",
  },
];

const steps = [
  { n: "01", label: "Create plans", body: "Build reusable workout splits from your exercise catalog." },
  { n: "02", label: "Assign members", body: "Choose the right plan for an individual member in seconds." },
  { n: "03", label: "Members follow", body: "Members open their app and follow the day's assigned training." },
  { n: "04", label: "Track progress", body: "Review lift logs, completion signals, and training history." },
];

const audience = [
  "Independent gyms",
  "Personal trainers",
  "Strength gyms",
  "Semi-personal training setups",
];

// ─── Animation variants ───────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { y: 32, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function featureIcon(key: string) {
  if (key === "zap") return <ZapIcon />;
  if (key === "grid") return <GridIcon />;
  if (key === "users") return <UsersIcon />;
  return <PhoneIcon />;
}

// ─── AppMockup ────────────────────────────────────────────────────────────────

const mockExercises = [
  { name: "Bench Press",      sets: 4, reps: 8,  kg: "85 kg", done: true  },
  { name: "Overhead Press",   sets: 3, reps: 10, kg: "50 kg", done: true  },
  { name: "Incline DB Press", sets: 3, reps: 12, kg: "30 kg", done: false },
  { name: "Tricep Pushdown",  sets: 3, reps: 15, kg: "-",     done: false },
];

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppMockup({ reduced }: { reduced: boolean }) {
  const [activeIdx, setActiveIdx] = useState(2);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % mockExercises.length);
    }, 2200);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <div className="lp-mockup">
      {/* top bar */}
      <div className="lp-mockup-bar">
        <span className="lp-mockup-gym">SHG Gym</span>
        <span className="lp-mockup-plan-tag">Push Day</span>
      </div>

      {/* header */}
      <div className="lp-mockup-header">
        <div>
          <div className="lp-mockup-day">Today&rsquo;s Workout</div>
          <div className="lp-mockup-member">Mehul - Week 3</div>
        </div>
        <div className="lp-mockup-progress-ring" aria-label="50% complete">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
            <circle cx="20" cy="20" r="16" fill="none" stroke="#C8F135" strokeWidth="3"
              strokeDasharray="100.5" strokeDashoffset="50" strokeLinecap="round"
              transform="rotate(-90 20 20)" />
          </svg>
          <span className="lp-mockup-ring-label">2/4</span>
        </div>
      </div>

      {/* exercise rows */}
      <div className="lp-mockup-exercises">
        {mockExercises.map((ex, i) => (
          <div
            key={ex.name}
            className={`lp-mockup-row${ex.done ? " lp-mockup-row-done" : ""}${i === activeIdx && !ex.done ? " lp-mockup-row-active" : ""}`}
          >
            <span className={`lp-mockup-check${ex.done ? " lp-mockup-check-done" : ""}`}>
              {ex.done ? <CheckIcon /> : null}
            </span>
            <span className="lp-mockup-ex-name">{ex.name}</span>
            <span className="lp-mockup-ex-detail">{ex.sets}x{ex.reps}</span>
            <span className="lp-mockup-ex-kg">{ex.kg}</span>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="lp-mockup-footer">
        <div className="lp-mockup-footer-btn">Log Next Set</div>
      </div>
    </div>
  );
}

// ─── Login modal ──────────────────────────────────────────────────────────────

function authErrMsg(err: unknown) {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(err.code)) {
      return "Invalid login details.";
    }
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  }
  return "Unable to sign in. Please try again.";
}

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"member" | "staff">("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isMember = mode === "member";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function switchMode(next: "member" | "staff") {
    setMode(next); setUsername(""); setPassword(""); setError(""); setMessage("");
  }

  function onBackdrop(e: ReactMouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setMessage("");
    const u = username.trim(), p = password.trim();
    if (!u) { setError(isMember ? "Enter your mobile number or email." : "Enter your username."); return; }
    if (isMember && !/^\d{4}$/.test(p)) { setError("PIN must be exactly 4 numeric digits."); return; }
    if (!isMember && !p) { setError("Enter your password."); return; }

    start(async () => {
      try {
        const fd = new FormData();
        fd.set("username", u); fd.set("password", p); fd.set("mode", mode);
        const session = await loginWithCredentials(fd);
        if (session.status !== "success") { setError(session.message); return; }
        window.scrollTo(0, 0);
        window.localStorage.setItem("fitsplit-session-start", String(Date.now()));
        window.location.replace(session.redirectUrl);
      } catch (err) {
        setError(authErrMsg(err));
      }
    });
  }

  function onForgot() {
    setError(""); setMessage("");
    const u = username.trim();
    if (!u) { setError(isMember ? "Enter your mobile/email first." : "Enter your username first."); return; }
    const msg = isMember
      ? "A reset request will be sent to the gym owner. Contact them for your new PIN."
      : "A reset request will be sent to the gym owner and admin.";
    if (!window.confirm(msg)) return;

    start(async () => {
      const fd = new FormData();
      fd.set("username", u); fd.set("mode", mode);
      const result = await requestPasswordReset(fd);
      if (result.status === "success") { setMessage(result.message); window.alert(result.message); }
      else setError(result.message);
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="lp-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onMouseDown={onBackdrop}
        >
          <motion.section
            className="lp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Login"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Header */}
            <div className="lp-modal-hdr">
              <div className="lp-modal-brand">
                <img src="/fitsplit-logo-dark.png" alt="FitSplit" width="22" height="22" />
                <span>FitSplit</span>
              </div>
              <button className="lp-modal-x" onClick={onClose} aria-label="Close login" type="button">
                <CloseIcon />
              </button>
            </div>

            <h2 className="lp-modal-title">Access your workspace</h2>
            <p className="lp-modal-sub">Members use mobile/email + PIN. Staff use username + password.</p>

            {/* Tabs */}
            <div className="lp-tabs" role="tablist" aria-label="Login type">
              {(["member", "staff"] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={mode === tab}
                  className={`lp-tab${mode === tab ? " lp-tab-on" : ""}`}
                  onClick={() => switchMode(tab)}
                  type="button"
                >
                  {tab[0].toUpperCase() + tab.slice(1)}
                  {mode === tab && (
                    <motion.span
                      className="lp-tab-underline"
                      layoutId="lp-tab-underline"
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Form */}
            <form
              ref={formRef}
              className="lp-modal-form"
              onSubmit={onSubmit}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); formRef.current?.requestSubmit(); } }}
            >
              <label className="lp-field">
                <span>{isMember ? "Mobile number or email" : "Username"}</span>
                <input
                  type="text"
                  autoComplete="username"
                  inputMode={isMember ? "email" : undefined}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>
              <label className="lp-field">
                <span>{isMember ? "4-digit PIN" : "Password"}</span>
                <input
                  type="password"
                  autoComplete={isMember ? "one-time-code" : "current-password"}
                  inputMode={isMember ? "numeric" : undefined}
                  maxLength={isMember ? 4 : undefined}
                  value={password}
                  onChange={(e) =>
                    setPassword(isMember ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)
                  }
                  pattern={isMember ? "\\d{4}" : undefined}
                  required
                />
              </label>
              {error && <p className="lp-form-error" role="alert">{error}</p>}
              {message && <p className="lp-form-success" role="status">{message}</p>}

              <button className="lp-btn-primary lp-w-full" disabled={isPending} type="submit">
                {isPending ? "Logging in..." : "Log in"}
              </button>
              <button className="lp-forgot" disabled={isPending} onClick={onForgot} type="button">
                Forgot password?
              </button>
            </form>

            <p className="lp-modal-note">
              Secure access for members, trainers, and gym owners.
            </p>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LandingPageClient() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduced = !mounted || (prefersReduced ?? false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [contactState, contactAction, contactPending] = useActionState(
    submitContactMessage,
    initialContactState
  );

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0.35]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActiveStep((s) => (s + 1) % 4), 800);
    return () => clearInterval(id);
  }, [reduced]);

  function openLogin() { setMenuOpen(false); setLoginOpen(true); }

  return (
    <div className="lp-root" id="top">
      {/* Noise texture overlay */}
      <div className="lp-noise" aria-hidden="true" />

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className={`lp-nav${scrolled ? " lp-nav-scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <a href="#top" className="lp-brand" aria-label="FitSplit home">
            <img src="/fitsplit-logo-dark.png" alt="" width="26" height="26" />
            <span>FitSplit</span>
          </a>

          <nav className="lp-nav-links" aria-label="Site navigation">
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#partners" onClick={() => setMenuOpen(false)}>Partners</a>
          </nav>

          <div className="lp-nav-end">
            <button className="lp-nav-login" onClick={openLogin} type="button">Login</button>
            <button
              className="lp-hamburger"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
              type="button"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "x" : "h"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.14 }}
                >
                  {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              className="lp-mobile-menu"
              aria-label="Mobile navigation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#partners" onClick={() => setMenuOpen(false)}>Partners</a>
              <button className="lp-nav-login lp-mobile-login" onClick={openLogin} type="button">
                Login
              </button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="lp-hero" ref={heroRef} aria-labelledby="lp-hero-title">
        {/* Background gym image + dark overlay */}
        <div className="lp-hero-bg" aria-hidden="true" />
        {/* Radial lime glow from top */}
        <div className="lp-hero-glow" aria-hidden="true" />

        <motion.div
          className="lp-hero-inner"
          style={reduced ? undefined : { opacity: heroOpacity }}
        >
          {/* Copy */}
          <motion.div className="lp-hero-copy" variants={stagger} initial="hidden" animate="show">
            <motion.p className="lp-eyebrow" variants={fadeUp}>
              <span className="lp-pulse-dot" aria-hidden="true" />
              Live workout delivery for gyms
            </motion.p>

            <motion.h1 className="lp-h1" id="lp-hero-title" variants={fadeUp}>
              Structured workouts.
              <br />
              Delivered to{" "}
              <span className="lp-gradient-text">every member.</span>
            </motion.h1>

            <motion.p className="lp-subheadline" variants={fadeUp}>
              FitSplit gives gym owners and trainers one calm workspace to assign plans, guide
              members, and track training in one focused workspace.
            </motion.p>

            <motion.div className="lp-hero-cta" variants={fadeUp}>
              <button className="lp-btn-primary lp-btn-arrow" onClick={openLogin} type="button">
                Access workspace
                <span className="lp-btn-arrow-icon"><ArrowRightIcon /></span>
              </button>
              <a href="#how-it-works" className="lp-btn-ghost">
                See how it works -&gt;
              </a>
            </motion.div>
          </motion.div>

          {/* App mockup visual */}
          <motion.div
            className="lp-hero-visual"
            initial={reduced ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.85, delay: 0.45, ease: EASE }}
          >
            <div className="lp-visual-glow" aria-hidden="true" />
            <AppMockup reduced={reduced} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Feature strip ────────────────────────────────────── */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-container">
          <motion.div
            className="lp-section-head"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.h2 className="lp-h2" variants={fadeUp}>
              Built around how training floors work.
            </motion.h2>
            <motion.p className="lp-section-sub" variants={fadeUp}>
              Less clutter. Clearer coaching. Just plans, members, and progress.
            </motion.p>
          </motion.div>

          <motion.div
            className="lp-feat-grid"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {featureCards.map((card) => (
              <motion.article key={card.title} className="lp-feat-card" variants={fadeUp}>
                <div className="lp-feat-icon" aria-hidden="true">
                  {featureIcon(card.icon)}
                </div>
                <h3 className="lp-h3">{card.title}</h3>
                <p>{card.body}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="lp-section lp-hiw" id="how-it-works">
        <div className="lp-container">
          <motion.div
            className="lp-section-head"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.h2 className="lp-h2" variants={fadeUp}>
              From plan to progress in four steps.
            </motion.h2>
          </motion.div>

          <div className="lp-steps" role="list">
            {steps.map((step, i) => (
              <div
                key={step.label}
                role="listitem"
                className={`lp-step${activeStep === i ? " lp-step-on" : ""}`}
              >
                <span className="lp-step-num" aria-hidden="true">{step.n}</span>
                <h3 className="lp-h3">{step.label}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audience ─────────────────────────────────────────── */}
      <section className="lp-section lp-audience">
        <div className="lp-container">
          <motion.div
            className="lp-audience-row"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <motion.span className="lp-audience-label" variants={fadeUp}>Works for</motion.span>
            <motion.div className="lp-pills" variants={stagger}>
              {audience.map((item) => (
                <motion.span key={item} className="lp-pill" variants={fadeUp}>
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Workflow bento ───────────────────────────────────── */}
      <section className="lp-section lp-workflow">
        <div className="lp-container">
          <motion.div
            className="lp-section-head"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.h2 className="lp-h2" variants={fadeUp}>
              Clean screens for the moments that matter.
            </motion.h2>
          </motion.div>

          <motion.div
            className="lp-bento"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Large card - assign workflow */}
            <motion.article className="lp-bento-card lp-bento-large" variants={fadeUp}>
              <div className="lp-mock lp-mock-assign" aria-hidden="true">
                <div className="lp-mock-bar">
                  <span className="lp-mock-dot" /><span className="lp-mock-dot" /><span className="lp-mock-dot" />
                  <span className="lp-mock-bar-title">Assign workout</span>
                </div>
                <div className="lp-mock-body">
                  <div className="lp-mock-row">
                    <span className="lp-mock-label">Member</span>
                    <strong className="lp-mock-val">Rahul Sharma</strong>
                    <small className="lp-mock-meta">Goal: Muscle gain</small>
                  </div>
                  <div className="lp-mock-row">
                    <span className="lp-mock-label">Split</span>
                    <strong className="lp-mock-val">PPL x 2</strong>
                    <small className="lp-mock-meta">6 days / week</small>
                  </div>
                  <div className="lp-mock-tags">
                    <span className="lp-mock-tag">Push / Pull / Legs</span>
                    <span className="lp-mock-tag lp-mock-accent">Assign plan</span>
                  </div>
                </div>
              </div>
              <h3 className="lp-h3">Assign workouts in seconds</h3>
              <p>Pick a saved split, pick a member, done. No rebuilding plans each time.</p>
            </motion.article>

            {/* Tall card - member view */}
            <motion.article className="lp-bento-card lp-bento-tall" variants={fadeUp}>
              <div className="lp-mock lp-mock-member" aria-hidden="true">
                <div className="lp-mock-bar">
                  <span className="lp-mock-dot" />
                  <span className="lp-mock-bar-title">Today - Push</span>
                </div>
                <div className="lp-mock-body">
                  <div className="lp-mock-day-head">Push Strength</div>
                  {["Bench press - 4x8", "Incline DB - 3x10", "Shoulder press - 3x10", "Lat raises - 3x15"].map(
                    (ex) => (
                      <div key={ex} className="lp-mock-ex">{ex}</div>
                    )
                  )}
                </div>
              </div>
              <h3 className="lp-h3">Members see only what matters</h3>
              <p>A clean mobile view for the day's exercises.</p>
            </motion.article>

            {/* Medium cards */}
            <motion.article className="lp-bento-card lp-bento-med" variants={fadeUp}>
              <div className="lp-bento-stat">
                <span className="lp-stat-big">86%</span>
                <span className="lp-stat-label">weekly completion rate</span>
              </div>
              <h3 className="lp-h3">Track progress clearly</h3>
              <p>Lift history keeps progressive overload visible.</p>
            </motion.article>

            <motion.article className="lp-bento-card lp-bento-med" variants={fadeUp}>
              <div className="lp-bento-stat">
                <span className="lp-stat-big">0</span>
                <span className="lp-stat-label">focused trainer workflow</span>
              </div>
              <h3 className="lp-h3">Built for real gyms</h3>
              <p>No complexity. Just training operations.</p>
            </motion.article>

            <motion.article className="lp-bento-card lp-bento-med" variants={fadeUp}>
              <div className="lp-bento-stat">
                <span className="lp-stat-big">2 min</span>
                <span className="lp-stat-label">to assign a new plan</span>
              </div>
              <h3 className="lp-h3">Trainer coordination</h3>
              <p>Everyone works from the same program library.</p>
            </motion.article>
          </motion.div>
        </div>
      </section>

      {/* ── Partners ─────────────────────────────────────────── */}
      <section className="lp-section lp-partners" id="partners">
        <div className="lp-container">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.h2 className="lp-h2 lp-center" variants={fadeUp}>
              Trusted by focused fitness communities.
            </motion.h2>
            <motion.article className="lp-partner-card" variants={fadeUp}>
              <img
                src="/shg-gym-logo.jpeg"
                alt="Sri Shakthi Hanuman Gym logo"
                className="lp-partner-logo"
              />
              <div className="lp-partner-copy">
                <h3 className="lp-h3">Sri Shakthi Hanuman Gym</h3>
                <blockquote className="lp-quote">
                  "FitSplit simplified how our trainers assign and track workouts across all our members."
                </blockquote>
                <cite className="lp-cite">Gym Manager, Sri Shakthi Hanuman Gym</cite>
              </div>
            </motion.article>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="lp-footer" id="contact">
        <div className="lp-container">
          <div className="lp-footer-grid">
            {/* Brand col */}
            <div className="lp-footer-brand">
              <div className="lp-brand">
                <img src="/fitsplit-logo-dark.png" alt="FitSplit logo" width="22" height="22" />
                <span>FitSplit</span>
              </div>
              <p>Workout delivery and trainer coordination for focused fitness teams.</p>
              <a href="mailto:hello@fitsplit.in" className="lp-footer-email">
                hello@fitsplit.in
              </a>
            </div>

            {/* Stats col */}
            <div className="lp-footer-stats">
              {[
                { val: "86%", label: "weekly completion rate" },
                { val: "2 min", label: "to assign a plan" },
                { val: "1", label: "focused trainer workspace" },
              ].map((s) => (
                <div key={s.label} className="lp-footer-stat">
                  <span className="lp-footer-stat-val">{s.val}</span>
                  <span className="lp-footer-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Contact form col */}
            <div className="lp-footer-form-col">
              <form action={contactAction}>
                <input name="source" type="hidden" value="footer-compact" />
                <label className="lp-field">
                  <span>Email</span>
                  <input name="email" type="email" placeholder="you@example.com" required />
                </label>
                <label className="lp-field">
                  <span>Message</span>
                  <textarea name="body" rows={3} placeholder="Tell us about your gym..." required />
                </label>
                {contactState.status === "error" && (
                  <p className="lp-form-error">{contactState.message}</p>
                )}
                {contactState.status === "success" && (
                  <p className="lp-form-success">{contactState.message}</p>
                )}
                <button className="lp-btn-primary lp-w-full" disabled={contactPending} type="submit">
                  {contactPending ? "Sending..." : "Send message"}
                </button>
              </form>
            </div>
          </div>

          <div className="lp-footer-bar">
            <span>© 2025 FitSplit - fitsplit.in</span>
            <span>Built for gyms that deliver coaching, not just access.</span>
          </div>
        </div>
      </footer>

      {/* ── Login modal ──────────────────────────────────────── */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
