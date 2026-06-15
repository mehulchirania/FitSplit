"use client";

import { FirebaseError } from "firebase/app";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
} from "framer-motion";
import { loginWithCredentials, requestPasswordReset } from "@/lib/auth";

import { LANDING_MOCK } from "@/lib/landing-mock";
import { X as CloseIcon } from "@/components/icons";

// ─── Animation variants ───────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
    if (!u) { setError(isMember ? "Enter your mobile number or username." : "Enter your username."); return; }
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
    if (!u) { setError(isMember ? "Enter your mobile number or username first." : "Enter your username first."); return; }
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
    <LazyMotion features={domAnimation}>
    <AnimatePresence>
      {open && (
        <m.div
          className="lp-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onMouseDown={onBackdrop}
        >
          <m.section
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
                <span>FitSplit</span>
              </div>
              <button className="lp-modal-x" onClick={onClose} aria-label="Close login" type="button">
                <CloseIcon />
              </button>
            </div>

            <h2 className="lp-modal-title">Access your workspace</h2>
            <p className="lp-modal-sub">Members use mobile number/username + PIN. Staff use username + password.</p>

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
                    <m.span
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
                <span>{isMember ? "Mobile number or username" : "Username"}</span>
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
          </m.section>
        </m.div>
      )}
    </AnimatePresence>
    </LazyMotion>
  );
}

// ─── Brand mark: uses the real logo image ────────────────────────────────────
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/new_logo.png"
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 8, display: "block", objectFit: "contain" }}
    />
  );
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
function IcDumbbell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14M18 5v14M6 9h12M6 15h12M3 9h3M3 15h3M18 9h3M18 15h3" />
    </svg>
  );
}
function IcCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IcChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IcUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EnquiryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  function onBackdrop(e: ReactMouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name || !contact) { window.alert("Please provide a name and contact info."); return; }
    window.alert("Enquiry sent! We will reach out to you at " + contact + " shortly.");
    onClose();
  }

  return (
    <LazyMotion features={domAnimation}>
    <AnimatePresence>
      {open && (
        <m.div className="lp-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onMouseDown={onBackdrop}>
          <m.section className="lp-modal" role="dialog" aria-modal="true" aria-label="Enquiry" initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 20 }} transition={{ duration: 0.3, ease: EASE }}>
            <div className="lp-modal-hdr">
              <div className="lp-modal-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
                <span>FitSplit</span>
              </div>
              <button className="lp-modal-x" onClick={onClose} aria-label="Close" type="button"><CloseIcon /></button>
            </div>
            <h2 className="lp-modal-title">Get in touch</h2>
            <p className="lp-modal-sub">Tell us a bit about your gym and we'll get back to you with setup instructions.</p>
            <form className="lp-modal-form" onSubmit={onSubmit}>
              <label className="lp-field"><span>Name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></label>
              <label className="lp-field"><span>Contact (Email or Phone)</span><input type="text" value={contact} onChange={(e) => setContact(e.target.value)} required /></label>
              <label className="lp-field">
                <span>Message (Optional)</span>
                <textarea 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)} 
                  rows={3} 
                  style={{ background: "var(--input-bg, rgba(255, 255, 255, 0.04))", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", color: "var(--fg)", fontSize: "16px", outline: "none", resize: "none", width: "100%", fontFamily: "inherit" }} 
                />
              </label>
              <button type="submit" className="lpd-btn lpd-btn--brand lpd-btn--lg" style={{ marginTop: "16px", width: "100%" }}>Send Enquiry</button>
              <p className="lp-modal-note" style={{ marginTop: "12px" }}>
                We use your details only to respond to your enquiry. See our{" "}
                <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
              </p>
            </form>
          </m.section>
        </m.div>
      )}
    </AnimatePresence>
    </LazyMotion>
  );
}

function IcArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function featIcon(icon: string) {
  if (icon === "dumbbell") return <IcDumbbell />;
  if (icon === "calendar") return <IcCalendar />;
  if (icon === "chart") return <IcChart />;
  return <IcUsers />;
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function L1_Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="lpd-nav">
      <div className="lpd-container lpd-nav__inner">
        <a className="lpd-brand" href="#top">
          <span className="lpd-brand__mark">
            <BrandMark size={44} />
          </span>
          FitSplit
        </a>
        <nav className="lpd-nav__links">
          {LANDING_MOCK.nav.map((item) => (
            item === "About" 
              ? <Link key={item} href="/about">{item}</Link>
              : <a key={item} href={`#l1-${item.toLowerCase().replace(/\s+/g, "-")}`}>{item}</a>
          ))}
        </nav>
        <div className="lpd-nav__cta">
          <button className="lpd-btn lpd-btn--ghost" onClick={onLogin}>Log in</button>
        </div>
      </div>
    </header>
  );
}

// ─── Dashboard mock ───────────────────────────────────────────────────────────
function L1_MockOwner() {
  return (
    <div className="l1-mock">
      <div className="l1-mock__chrome">
        <span /><span /><span />
        <div className="l1-mock__url">fitsplit.app/owner</div>
      </div>
      <div className="l1-mock__body">
        <div className="l1-mock__row">
          <strong>Good morning, Priya</strong>
          <span>3 things need your attention</span>
        </div>
        <div className="l1-mock__kpis">
          {[
            { l: "Renewals due",  v: "18", tone: "danger" },
            { l: "Plans pending", v: "23", tone: "accent" },
          ].map((k) => (
            <div key={k.l} className={`l1-mock__kpi l1-mock__kpi--${k.tone}`}>
              <small>{k.l}</small>
              <strong>{k.v}</strong>
            </div>
          ))}
        </div>
        <div className="l1-mock__list">
          {[
            { tag: "EXPIRED", who: "Rohan Mehta",  what: "Annual Pro · lapsed 4 days ago", tone: "danger" },
            { tag: "PAYMENT", who: "Ananya Bose",   what: "Half-year PT · ₹18,500",         tone: "warn"   },
            { tag: "NO PLAN", who: "Pari Saxena",   what: "Joined 11 days ago",              tone: "accent" },
          ].map((r) => (
            <div key={r.who} className={`l1-mock__action l1-mock__action--${r.tone} l1-mock__action--no-btn`}>
              <span className="l1-mock__action-tag">{r.tag}</span>
              <div>
                <strong>{r.who}</strong>
                <small>{r.what}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Phone mock ───────────────────────────────────────────────────────────────
function L1_MockPhone() {
  const exercises = [
    { name: "Bench Press",     sub: "4 × 5–8 · 52.5kg",      done: true   },
    { name: "Incline DB Press",sub: "3 × 8–10 · 18kg",        done: true   },
    { name: "Overhead Press",  sub: "3 × 6–8 · ↑ try 27.5kg", active: true },
  ];
  return (
    <div className="l1-phone">
      <div className="l1-phone__notch" />
      <div className="l1-phone__body">
        <div className="l1-phone__head">
          <small>TODAY&apos;S SESSION</small>
          <strong>Day B · Push</strong>
          <span>Week 4 · 6 lifts · ~55m</span>
        </div>
        {exercises.map((ex) => (
          <div key={ex.name} className={`l1-phone__ex${ex.active ? " l1-phone__ex--active" : ""}`}>
            <span className={`l1-phone__check${ex.done ? " l1-phone__check--on" : ""}`}>
              {ex.done ? "✓" : ""}
            </span>
            <div>
              <strong>{ex.name}</strong>
              <small>{ex.sub}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function L1_Hero({ onLogin }: { onLogin: () => void }) {
  const { hero } = LANDING_MOCK;
  return (
    <section className="l1-hero" id="top">
      <div className="lpd-container l1-hero__inner">
        {/* Left copy */}
        <div>
          <span className="lpd-eyebrow">
            <span className="lpd-pulse" />
            {hero.eyebrow}
          </span>
          <h1 className="l1-h1">
            {hero.h1}
            <br />
            <span className="l1-h1__accent">{hero.h1Accent}</span>
          </h1>
          <p className="l1-hero__sub">{hero.sub}</p>
          <div className="l1-hero__cta">
            <button className="lpd-btn lpd-btn--primary lpd-btn--lg" onClick={onLogin}>
              Log in <IcArrow />
            </button>
          </div>
        </div>

        {/* Right visual */}
        <div className="l1-hero__visual">
          <L1_MockOwner />
          <div className="l1-hero__phone">
            <L1_MockPhone />
          </div>
        </div>
      </div>
    </section>
  );
}


// ─── Features ─────────────────────────────────────────────────────────────────
function L1_Features() {
  return (
    <section className="lpd-section" id="l1-product">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">Features</span>
          <h2 className="lpd-h2">Everything a coaching gym needs.</h2>
          <p className="lpd-sub">One app for owners, trainers, and members — no stitching together spreadsheets and WhatsApp.</p>
        </div>
        <div className="l1-feat-grid">
          {LANDING_MOCK.features.map((f, i) => (
            <div key={f.title} className="l1-feat" data-reveal data-delay={String(i + 1)}>
              <div className="l1-feat__icon">{featIcon(f.icon)}</div>
              <span className="l1-feat__tag">{f.tag}</span>
              <h3 className="l1-feat__title">{f.title}</h3>
              <p className="l1-feat__body">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function L1_HowItWorks() {
  return (
    <section className="lpd-section l1-how">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">How it works</span>
          <h2 className="lpd-h2">Live in under a week.</h2>
          <p className="lpd-sub">Import your member list, build your first templates, and you&apos;re delivering structured workouts.</p>
        </div>
        <div className="l1-steps">
          {LANDING_MOCK.steps.map((s, i) => (
            <div key={s.n} className="l1-step" data-reveal data-delay={String(i + 1)}>
              <span className="l1-step__num">{s.n}</span>
              <h3 className="l1-step__label">{s.label}</h3>
              <p className="l1-step__body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



// ─── Pricing (temporarily hidden — uncomment when ready) ─────────────────────
/*
function L1_Pricing({ onLogin }: { onLogin: () => void }) {
  const { pricing } = LANDING_MOCK;
  return (
    <section className="lpd-section l1-pricing" id="l1-pricing">
      <div className="lpd-container">
        <div className="lpd-section-head">
          <span className="lpd-section-label">Pricing</span>
          <h2 className="lpd-h2">{pricing.title}</h2>
          <p className="lpd-sub">{pricing.sub}</p>
        </div>
        <div className="l1-plans">
          {pricing.plans.map((plan) => (
            <div key={plan.name} className={`l1-plan${plan.featured ? " l1-plan--feat" : ""}`}>
              {plan.featured && <span className="l1-plan__pill">Most popular</span>}
              <p className="l1-plan__name">{plan.name}</p>
              <div className="l1-plan__price">
                {plan.priceMonthly !== null ? (
                  <>
                    <strong>₹{plan.priceMonthly}</strong>
                    <span>{plan.priceUnit}</span>
                  </>
                ) : (
                  <>
                    <strong style={{ fontSize: 28 }}>Custom</strong>
                    <span>{plan.priceUnit}</span>
                  </>
                )}
              </div>
              <p className="l1-plan__tagline">{plan.tagline}</p>
              <ul className="l1-plan__features">
                {plan.features.map((f) => (
                  <li key={f}><IcCheck /> {f}</li>
                ))}
              </ul>
              <button
                className={`lpd-btn ${plan.featured ? "lpd-btn--brand" : "lpd-btn--ghost"}`}
                style={{ width: "100%" }}
                onClick={onLogin}
              >
                {plan.priceMonthly !== null ? "Start free trial" : "Contact us"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
*/

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function L1_FAQ() {
  return (
    <section className="lpd-section lpd-section--tight" id="l1-faq">
      <div className="lpd-container">
        <div className="lpd-section-head lpd-section-head--left" style={{ maxWidth: 760 }}>
          <span className="lpd-section-label">FAQ</span>
          <h2 className="lpd-h2">Common questions.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "64px", alignItems: "flex-start" }}>
          <div className="l1-faq__list" style={{ maxWidth: "100%" }}>
            {LANDING_MOCK.faq.map((item) => (
              <details key={item.q} className="l1-faq__item">
                <summary>
                  {item.q}
                  <IcPlus />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <div className="l1-contact-form" style={{ background: "var(--bg-elevated)", padding: "32px", borderRadius: "24px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "var(--text)" }}>Have another question?</h3>
            <p style={{ fontSize: "14px", color: "var(--text-soft)", marginBottom: "24px" }}>Send us a message and we'll get back to you shortly.</p>
            <form className="lp-modal-form" onSubmit={(e) => { 
              e.preventDefault(); 
              window.alert("Message sent to admin inbox!"); 
              (e.target as HTMLFormElement).reset();
            }}>
               <label className="lp-field"><span>Name</span><input type="text" required /></label>
               <label className="lp-field"><span>Email</span><input type="email" required /></label>
               <label className="lp-field"><span>Message</span><textarea rows={4} style={{ background: "var(--input-bg, rgba(255, 255, 255, 0.04))", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", color: "var(--fg)", fontSize: "16px", outline: "none", resize: "none", width: "100%", fontFamily: "inherit" }} required /></label>
               <button type="submit" className="lpd-btn lpd-btn--brand lpd-btn--lg" style={{ width: "100%", marginTop: "8px" }}>Send message</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA banner ───────────────────────────────────────────────────────────────
function L1_CTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="l1-cta">
      <div className="lpd-container">
        <div className="l1-cta__card">
          <div>
            <h2 className="lpd-h2">Built for gyms that deliver coaching, not just access.</h2>
            <p className="lpd-sub">14 days free. No card required. Live in under a week.</p>
          </div>
          <div className="l1-cta__btns">
            <button className="lpd-btn lpd-btn--brand lpd-btn--lg" onClick={onLogin}>
              Log in <IcArrow />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function L1_Footer({ onEnquiry }: { onEnquiry: () => void }) {
  return (
    <footer className="lpd-foot">
      <div className="lpd-container">
        <div className="lpd-foot__grid">
          <div>
            <a className="lpd-brand" href="#top">
              <span className="lpd-brand__mark">
                <BrandMark size={44} />
              </span>
              FitSplit
            </a>
            <p className="lpd-foot__brand-blurb">Workout delivery, trainer coordination, member progress — one workspace.</p>
          </div>
          {[
            { h: "Product", items: ["Owner dashboard", "Trainer console", "Member app"] },
            { h: "Company", items: ["About"] },
            { h: "Support", items: ["Help center", "Contact", "Status", "Privacy", "Terms"] }
          ].map((col) => (
            <div key={col.h} className="lpd-foot__col">
              <h4>{col.h}</h4>
              <ul>
                {col.items.map((item) => {
                  if (item === "Help center") return <li key={item}><button className="lp-foot-btn" onClick={onEnquiry}>{item}</button></li>;
                  if (item === "Contact") return <li key={item}><button className="lp-foot-btn" onClick={() => window.alert("Write to: fitsplit.in@gmail.com")}>{item}</button></li>;
                  if (item === "Status") return <li key={item}><button className="lp-foot-btn" onClick={() => window.alert("All systems operational.")}>{item}</button></li>;
                  if (item === "Privacy") return <li key={item}><Link href="/privacy">{item}</Link></li>;
                  if (item === "Terms") return <li key={item}><Link href="/terms">{item}</Link></li>;
                  if (item === "About") return <li key={item}><Link href="/about">{item}</Link></li>;
                  return <li key={item}><a href="#">{item}</a></li>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="lpd-foot__bar">
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>
            Built in India · in collaboration with{" "}
            <a href="https://blumelabs.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>Blume Labs</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function LandingPageClient() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  // ── Scroll-reveal: fade in elements with [data-reveal] ──────────────────
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="lpd l1">
        <L1_Nav onLogin={() => setLoginOpen(true)} />

        {/* Hero is immediately visible — no scroll-reveal wrapper */}
        <L1_Hero onLogin={() => setLoginOpen(true)} />



        <div data-reveal>
          <L1_Features />
        </div>

        <div data-reveal>
          <L1_HowItWorks />
        </div>



        {/* Pricing hidden — uncomment <L1_Pricing> here when ready */}

        <div data-reveal>
          <L1_FAQ />
        </div>

        <div data-reveal>
          <L1_CTA onLogin={() => setLoginOpen(true)} />
        </div>

        <L1_Footer onEnquiry={() => setEnquiryOpen(true)} />
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </>
  );
}
