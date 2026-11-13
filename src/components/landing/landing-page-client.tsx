"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { HeroVisual } from "./hero-visual";
import { LoginModal } from "./login-modal";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

// ─── Icons ────────────────────────────────────────────────────────────────────

type IconProps = { size?: number };

function IconDumbbell({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5 17.5 17.5M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7" />
    </svg>
  );
}
function IconCalendar({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconChart({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-7" />
    </svg>
  );
}
function IconList({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconArrow({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconCheck({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconSpark({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
    </svg>
  );
}

function featIcon(icon: string) {
  if (icon === "dumbbell") return <IconDumbbell />;
  if (icon === "calendar") return <IconCalendar />;
  if (icon === "chart") return <IconChart />;
  return <IconList />;
}

// ─── Content ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "What you get", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" }
];

const MARQUEE_ITEMS = [
  "Free workout plans",
  "Exercise library",
  "Log every set",
  "Works offline",
  "Progress charts",
  "Build your own plan",
  "Macro tracking",
  "Body weight log"
];

const FEATURES = [
  {
    icon: "dumbbell",
    tag: "Plans",
    title: "Proven workout splits",
    body: "Push / pull / legs, upper / lower, bro split and more. Pick one and see exactly what today's session is."
  },
  {
    icon: "list",
    tag: "Library",
    title: "An exercise library you can search",
    body: "Browse exercises by muscle group and equipment, swap a movement when the rack is taken, or add your own."
  },
  {
    icon: "calendar",
    tag: "Logging",
    title: "Log every set in seconds",
    body: "Weight, reps, done. Sets queue up on your phone if the signal drops and sync when you are back online."
  },
  {
    icon: "chart",
    tag: "Progress",
    title: "See the trend, not just the last workout",
    body: "Lift charts, estimated one-rep maxes, a consistency calendar and body-weight tracking, all in one place."
  }
];

const POINTS = [
  { strong: "Free, no catch", rest: " — create an account and start training. No trial, no card, no paywall." },
  { strong: "Yours to shape", rest: " — follow a built-in split or build your own plan day by day." },
  { strong: "Private by default", rest: " — your logs belong to you. Export or delete them any time." }
];

const STEPS = [
  { n: "01", label: "Create an account", body: "Name, email and a password. That is the whole signup." },
  { n: "02", label: "Pick a plan", body: "Choose a split from the library, or build your own from the exercise list." },
  { n: "03", label: "Train and log", body: "Open today's workout, log each set, and watch your numbers climb." }
];

const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: "Is FitSplit really free?",
    a: "Yes. Plans, the exercise library, set logging, charts and macro tracking are all free. There are no paid tiers."
  },
  {
    q: "Do I need a gym membership?",
    a: "No. FitSplit works for any gym, a home setup, or bodyweight training. Choose plans that match your equipment."
  },
  {
    q: "Does it work without a signal?",
    a: "Yes. Sets you log offline are stored on your device and synced automatically the next time you are online."
  },
  {
    q: "Can I use it on my phone?",
    a: "FitSplit is a web app built for phones. Add it to your home screen for an app-like experience on iOS and Android."
  },
  {
    q: "What happens to my data?",
    a: (
      <>
        It is yours. You can export everything as a file or delete your account from settings. See the{" "}
        <Link href="/privacy">privacy policy</Link> for details.
      </>
    )
  }
];

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function useReveal(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el, i) => {
      el.style.setProperty("--lp-reveal-delay", `${(i % 4) * 70}ms`);
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [rootRef]);
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="lp-nav">
      <div className="lp-container lp-nav__inner">
        <a href="#top" className="lp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="FitSplit" />
          <span>FitSplit</span>
        </a>
        <nav className="lp-nav__links" aria-label="Landing page sections">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lp-nav__actions">
          <button type="button" className="lp-btn lp-btn--ghost" onClick={onLogin}>
            Sign in
          </button>
          <a href="/signup" className="lp-btn lp-btn--primary" style={{ textDecoration: "none" }}>
            Sign up free
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="top" className="lp-container lp-hero">
      <div>
        <h1 className="lp-hero__title lp-reveal" data-reveal>
          Workouts that
          <br />
          <em>just work. Free.</em>
        </h1>
        <p className="lp-hero__sub lp-reveal" data-reveal>
          Pick a proven plan, log every set, and watch your progress build. FitSplit gives you the workouts and
          keeps the rest simple.
        </p>
        <div className="lp-reveal" data-reveal style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <a href="/signup" className="lp-btn lp-btn--primary lp-btn--lg" style={{ textDecoration: "none" }}>
            Start training free <IconArrow />
          </a>
          <button type="button" className="lp-btn lp-btn--ghost lp-btn--lg" onClick={onLogin}>
            I have an account
          </button>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee__track">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="lp-marquee__item">
            <IconSpark size={11} />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-reveal" data-reveal>
          <span className="lp-eyebrow">What you get</span>
          <h2 className="lp-h2">
            Structured,
            <br />
            not scattered.
          </h2>
          <p className="lp-lede">Follow a split, log your sets, and see your progress instead of guessing.</p>
        </div>

        <div className="lp-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-card lp-reveal" data-reveal>
              <span className="lp-card__icon">{featIcon(f.icon)}</span>
              <span className="lp-card__tag">{f.tag}</span>
              <h3 className="lp-card__title">{f.title}</h3>
              <p className="lp-card__body">{f.body}</p>
            </div>
          ))}
        </div>

        <ul className="lp-checklist lp-checklist--lede lp-reveal" data-reveal style={{ marginTop: 32 }}>
          {POINTS.map((point) => (
            <li key={point.strong}>
              <IconCheck />
              <span>
                <strong>{point.strong}</strong>
                {point.rest}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-section__head--center lp-reveal" data-reveal>
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-h2">Training in three steps.</h2>
          <p className="lp-lede">From signup to your first logged set in a couple of minutes.</p>
        </div>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="lp-step lp-reveal" data-reveal>
              <span className="lp-step__n">{s.n}</span>
              <h3 className="lp-step__title">{s.label}</h3>
              <p className="lp-step__body">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="lp-reveal" data-reveal style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <a href="/signup" className="lp-btn lp-btn--primary lp-btn--lg" style={{ textDecoration: "none" }}>
            Create your free account <IconArrow />
          </a>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-section__head--center lp-reveal" data-reveal>
          <span className="lp-eyebrow">FAQ</span>
          <h2 className="lp-h2">Common questions.</h2>
        </div>
        <div className="lp-faq">
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q} className="lp-faq__item lp-reveal" data-reveal>
              <button
                type="button"
                className="lp-faq__q"
                aria-expanded={openIdx === i}
                aria-controls={`lp-faq-a-${i}`}
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
              >
                {item.q}
                <span aria-hidden="true">+</span>
              </button>
              <div className="lp-faq__a" id={`lp-faq-a-${i}`}>
                <div>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onLogin }: { onLogin: () => void }) {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          <div>
            <a href="#top" className="lp-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/new_logo.png" alt="FitSplit" />
              <span>FitSplit</span>
            </a>
            <p className="lp-footer__about">Free workout plans and a simple training log.</p>
          </div>
          <div className="lp-footer__col">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">What you get</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="lp-footer__col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
            </ul>
          </div>
          <div className="lp-footer__col lp-footer__col--legal">
            <h4>Legal</h4>
            <ul>
              {LEGAL_DOCUMENTS.map((document) => (
                <li key={document.key}>
                  <Link href={document.href}>{document.title}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-footer__col">
            <h4>Get started</h4>
            <ul>
              <li><Link href="/signup">Sign up free</Link></li>
              <li>
                <a
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    onLogin();
                  }}
                >
                  Sign in
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="lp-footer__base">
          <span>© 2026 FitSplit · fitsplit.in</span>
          <span>Built in India</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LandingPageClient() {
  const [loginOpen, setLoginOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="lp-root">
      <div className="lp-backdrop" aria-hidden="true" />
      <div className="lp-content">
        <Nav onLogin={() => setLoginOpen(true)} />
        <main>
          <Hero onLogin={() => setLoginOpen(true)} />
          <Marquee />
          <Features />
          <HowItWorks />
          <FAQ />
        </main>
        <Footer onLogin={() => setLoginOpen(true)} />
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
