"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { HeroVisual } from "./hero-visual";
import { LoginModal } from "./login-modal";
import { ComingSoonModal } from "./coming-soon-modal";
import { EnquirySection } from "./enquiry-section";
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
function IconUsers({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconMapPin({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
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
  if (icon === "mappin") return <IconMapPin />;
  return <IconUsers />;
}

// ─── Content ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "The model", href: "#model" },
  { label: "Athletes", href: "#athletes" },
  { label: "Gyms", href: "#gyms" },
  { label: "FAQ", href: "#faq" }
];

const MARQUEE_ITEMS = [
  "Workout programs",
  "Offline-first lift logging",
  "Progress trend charts",
  "Macro tracking",
  "Member management",
  "PT scheduling",
  "Geofenced attendance",
  "Renewals & payments",
  "Push notifications",
  "Exercise video library"
];

type CtaAction = { label: string; kind: "modal" | "href"; href?: string };

const HERO_PATHS: {
  eyebrow: string;
  badge: string;
  live: boolean;
  title: string;
  body: string;
  cta: CtaAction;
}[] = [
  {
    eyebrow: "I run a gym",
    badge: "Live now",
    live: true,
    title: "Give the whole floor structure.",
    body: "Assign programs, run PT bookings, track geofenced attendance, approve renewals — from one workspace.",
    cta: { label: "Get FitSplit for your gym", kind: "href", href: "#enquiry" }
  },
  {
    eyebrow: "I train myself",
    badge: "Live now",
    live: true,
    title: "Follow a plan. Log every set.",
    body: "A proven split, offline-first lift logging, and progress you can actually see — no gym membership required.",
    cta: { label: "Start training free →", kind: "href", href: "/signup" }
  }
];

const MODEL_STEPS = [
  {
    n: "01",
    title: "Gyms subscribe",
    body: "Owners get the operating workspace: member management, renewals, payments, PT delivery, geofenced attendance, trainer seats.",
    pill: "Business · live",
    live: true
  },
  {
    n: "02",
    title: "Every member gets full Pro",
    body: "Included with the gym's plan, at no extra cost. Members get the complete training app — programs, offline logging, trends — plus everything their gym assigns.",
    pill: "Included · live",
    live: true
  },
  {
    n: "03",
    title: "Solo athletes train free",
    body: "No gym? Start free with real programs and logging. Pick any split from the library and track progressive overload. Your data stays yours forever.",
    pill: "Consumer · live",
    live: true
  }
];

const INDIVIDUAL_POINTS = [
  { strong: "Follow a proven split", rest: " — structured programs built around a goal, not a routine you made up at 6am." },
  { strong: "Log every set, even offline", rest: " — poor gym signal never loses a rep; it syncs the moment you're back." },
  { strong: "Watch your progress trend", rest: " — lift charts, body metrics, and macros, all in one place." }
];

type Plan = {
  name: string;
  badge: string;
  tagline: string;
  features: string[];
  cta: string;
  href?: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    badge: "Free forever",
    tagline: "Everything you need to start training with structure.",
    features: [
      "Unlimited workout logging with offline sync",
      "Full split library & starter templates",
      "Progressive overload & 1RM estimation",
      "Muscle heatmap & consistency calendar",
      "Macro and body-metric logging"
    ],
    cta: "Start free →",
    href: "/signup"
  },
  {
    name: "Pro",
    badge: "Coming soon",
    tagline: "For lifters who want AI coaching and multi-gym analytics.",
    features: [
      "AI Coach workout adjustments",
      "Custom splits built around your schedule",
      "Multi-gym workspace sync",
      "Advanced trend & fatigue analytics",
      "Dedicated priority support"
    ],
    cta: "Join the waitlist",
    highlight: true
  }
];

const GYM_FEATURES = [
  { icon: "users", tag: "Members", title: "Member management & renewals", body: "Onboard members with PIN logins, see who's due, and approve renewal requests without chasing anyone." },
  { icon: "dumbbell", tag: "Programs", title: "Assign programs in seconds", body: "Pick a saved split, pick a member, done. Programs sync to the member app instantly." },
  { icon: "calendar", tag: "Training", title: "PT scheduling", body: "Bookings, reschedules, and session history — trainers run their calendar from one screen." },
  { icon: "mappin", tag: "Attendance", title: "Geofenced attendance", body: "Members check in on-site, so you get an accurate floor view without a manual register." }
];

const STEPS = [
  { n: "01", label: "Add your gym", body: "Bring on your members and staff — PIN logins mean no one needs to remember a password." },
  { n: "02", label: "Build your library", body: "Create reusable workout splits and program templates once." },
  { n: "03", label: "Assign & members train", body: "Pick a plan for a member; they see today's session instantly in the app." },
  { n: "04", label: "Track the floor", body: "Renewals, attendance, and PT sessions — all from one workspace." }
];

const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: "How long does setup take?",
    a: "Most gyms are live within a week. Add your members and staff, build your first program templates, and you're delivering structured workouts."
  },
  {
    q: "Do you support mobile apps?",
    a: "Yes — native-feel web apps for members and trainers. PWA install works on both iOS and Android."
  },
  {
    q: "How do I get my members set up?",
    a: "We'll help you add your member list and build your first program templates together — most gyms don't need more than a short onboarding call."
  },
  {
    q: "Can I use FitSplit without a gym?",
    a: (
      <>
        Individual accounts are coming soon. Leave your interest via the{" "}
        <a href="#enquiry">enquiry form</a> below and we&apos;ll let you know the moment it&apos;s open.
      </>
    )
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Add your full member list during the trial, no card required."
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

// ─── Shared bits ──────────────────────────────────────────────────────────────

function CtaButton({
  action,
  className,
  onComingSoon
}: {
  action: CtaAction;
  className: string;
  onComingSoon: () => void;
}) {
  if (action.kind === "href") {
    return (
      <a className={className} href={action.href}>
        {action.label} <IconArrow />
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={onComingSoon}>
      {action.label} <IconArrow />
    </button>
  );
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

function Hero({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <section id="top" className="lp-container lp-hero">
      <div>
        <h1 className="lp-hero__title lp-reveal" data-reveal>
          Run the floor.
          <br />
          <em>Own your training.</em>
        </h1>
        <p className="lp-hero__sub lp-reveal" data-reveal>
          One app, both sides of the gym. Owners and trainers run members, payments, PT, and attendance — and
          every athlete on the floor gets the full training app, not a stripped-down view.
        </p>
        <div className="lp-hero__paths lp-reveal" data-reveal>
          {HERO_PATHS.map((path) => (
            <div key={path.eyebrow} className={path.live ? "lp-path lp-path--live" : "lp-path"}>
              <div className="lp-path__head">
                <span className="lp-path__eyebrow">{path.eyebrow}</span>
                <span className={path.live ? "lp-path__badge lp-path__badge--live" : "lp-path__badge"}>
                  {path.badge}
                </span>
              </div>
              <h2 className="lp-path__title">{path.title}</h2>
              <p className="lp-path__body">{path.body}</p>
              <CtaButton action={path.cta} className="lp-btn lp-btn--primary" onComingSoon={onComingSoon} />
            </div>
          ))}
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

function Model() {
  return (
    <section id="model" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-reveal" data-reveal>
          <span className="lp-eyebrow">How it fits together</span>
          <h2 className="lp-h2">One app, two jobs.</h2>
          <p className="lp-lede">
            Business plans help you run a roster. Consumer plans help you train yourself. Neither is a bigger
            version of the other — and that&apos;s the point.
          </p>
        </div>
        <div className="lp-model__grid">
          {MODEL_STEPS.map((step) => (
            <div key={step.n} className="lp-model__cell lp-reveal" data-reveal>
              <span className="lp-model__num">{step.n}</span>
              <h3 className="lp-model__title">{step.title}</h3>
              <p className="lp-model__body">{step.body}</p>
              <span className={step.live ? "lp-model__pill lp-model__pill--live" : "lp-model__pill"}>
                {step.pill}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Athletes({ onComingSoon }: { onComingSoon: () => void }) {
  return (
    <section id="athletes" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-reveal" data-reveal>
          <span className="lp-eyebrow">For athletes</span>
          <h2 className="lp-h2">
            Structured,
            <br />
            not scattered.
          </h2>
          <p className="lp-lede">Follow a split, log your sets, and see your progress instead of guessing.</p>
        </div>

        <ul className="lp-checklist lp-checklist--lede lp-reveal" data-reveal>
          {INDIVIDUAL_POINTS.map((point) => (
            <li key={point.strong}>
              <IconCheck />
              <span>
                <strong>{point.strong}</strong>
                {point.rest}
              </span>
            </li>
          ))}
        </ul>

        <div className="lp-plans">
          {PLANS.map((plan) => (
            <div key={plan.name} className={plan.highlight ? "lp-plan lp-plan--highlight lp-reveal" : "lp-plan lp-reveal"} data-reveal>
              <div className="lp-plan__head">
                <span className="lp-plan__name">{plan.name}</span>
                <span className="lp-plan__badge">{plan.badge}</span>
              </div>
              <p className="lp-plan__tagline">{plan.tagline}</p>
              <ul className="lp-plan__list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <IconCheck />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.href ? (
                <a href={plan.href} className="lp-btn lp-btn--primary lp-plan__cta" style={{ textDecoration: "none", textAlign: "center" }}>
                  {plan.cta}
                </a>
              ) : (
                <button type="button" className="lp-btn lp-btn--primary lp-plan__cta" onClick={onComingSoon}>
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gyms() {
  return (
    <section id="gyms" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-reveal" data-reveal>
          <span className="lp-eyebrow">For gyms</span>
          <h2 className="lp-h2">Run the floor. Give every member the app.</h2>
          <p className="lp-lede">
            Members, programs, PT bookings, and attendance in one workspace — and every member on your roster gets
            the full training app, not a stripped-down view.
          </p>
        </div>

        <div className="lp-features">
          {GYM_FEATURES.map((f) => (
            <div key={f.title} className="lp-card lp-reveal" data-reveal>
              <span className="lp-card__icon">{featIcon(f.icon)}</span>
              <span className="lp-card__tag">{f.tag}</span>
              <h3 className="lp-card__title">{f.title}</h3>
              <p className="lp-card__body">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="lp-highlight lp-reveal" data-reveal>
          <div>
            <h3 className="lp-highlight__title">Every member gets the full training app.</h3>
            <p className="lp-highlight__body">
              Not a stripped-down view for members — the same structured workouts, offline logging, and progress
              tracking, for every person on your floor.
            </p>
          </div>
          <a className="lp-btn lp-btn--primary lp-btn--lg" href="#enquiry">
            Get FitSplit for your gym <IconArrow />
          </a>
        </div>
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
          <h2 className="lp-h2">Live in under a week.</h2>
          <p className="lp-lede">
            Add your members, build your first templates, and start delivering structured workouts.
          </p>
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
            <p className="lp-footer__about">
              Structured training for individuals, and a full operating workspace for the gyms that run it.
            </p>
          </div>
          <div className="lp-footer__col">
            <h4>Product</h4>
            <ul>
              <li><a href="#model">The model</a></li>
              <li><a href="#athletes">For athletes</a></li>
              <li><a href="#gyms">For gyms</a></li>
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
              <li><a href="#enquiry">Contact us</a></li>
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
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="lp-root">
      <div className="lp-backdrop" aria-hidden="true" />
      <div className="lp-content">
        <Nav onLogin={() => setLoginOpen(true)} />
        <main>
          <Hero onComingSoon={() => setComingSoonOpen(true)} />
          <Marquee />
          <Model />
          <Athletes onComingSoon={() => setComingSoonOpen(true)} />
          <Gyms />
          <HowItWorks />
          <FAQ />
          <EnquirySection />
        </main>
        <Footer onLogin={() => setLoginOpen(true)} />
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <ComingSoonModal open={comingSoonOpen} onClose={() => setComingSoonOpen(false)} />
    </div>
  );
}
