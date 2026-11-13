"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LoginModal } from "./login-modal";
import { PhoneMockup } from "./phone-mockup";

const svgProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true
};

const VALUE_POINTS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    title: "A plan built for you",
    body: "Pick a proven split or shape your own. Open the app and today's session is already waiting."
  },
  {
    icon: (
      <svg {...svgProps}>
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
    ),
    title: "Log sets in seconds",
    body: "Weight, reps, done. Sets save even when the gym signal drops, then sync on their own."
  },
  {
    icon: (
      <svg {...svgProps}>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 6-7" />
      </svg>
    ),
    title: "Progress you can see",
    body: "Lift charts, estimated one-rep maxes and a consistency calendar show exactly what is working."
  }
];

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/health-disclaimer", label: "Health disclaimer" },
  { href: "/data-rights", label: "Your data" }
];

export function LandingPageClient() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="lp-root" id="top">
      <header className="lp-nav">
        <div className="lp-nav__inner">
          <a href="#top" className="lp-brand" aria-label="FitSplit home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="" width={44} height={18} />
            <span>FitSplit</span>
          </a>
          <button type="button" className="lp-navlink" onClick={() => setLoginOpen(true)}>
            Sign in
          </button>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero__copy">
            <h1 className="lp-hero__title">Train with a plan.</h1>
            <p className="lp-hero__sub">
              A workout plan made for you, the fastest way to log every set, and proof that you are getting stronger.
            </p>
            <div className="lp-hero__actions">
              <Link href="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                Start training
              </Link>
              <button type="button" className="lp-btn lp-btn--text lp-btn--lg" onClick={() => setLoginOpen(true)}>
                Sign in
              </button>
            </div>
          </div>

          <div className="lp-hero__stage">
            <div className="lp-hero__glow" aria-hidden="true" />
            <PhoneMockup />
          </div>
        </section>

        <section className="lp-points" aria-label="What you get">
          <ul className="lp-points__grid">
            {VALUE_POINTS.map((p) => (
              <li key={p.title} className="lp-point">
                <span className="lp-point__icon">{p.icon}</span>
                <h2 className="lp-point__title">{p.title}</h2>
                <p className="lp-point__body">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-closing">
          <div className="lp-closing__panel">
            <h2 className="lp-closing__title">Your next session starts here.</h2>
            <Link href="/signup" className="lp-btn lp-btn--inverse lp-btn--lg">
              Start training
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <nav className="lp-footer__links" aria-label="Legal">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="lp-footer__copy">© {new Date().getFullYear()} FitSplit</p>
        </div>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
