"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeroVisual } from "./hero-visual";
import { LoginModal } from "./login-modal";
import { EnquirySection } from "./enquiry-section";

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
      <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
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
  return <IconUsers />;
}

// ─── Content ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" }
];

const MARQUEE_ITEMS = [
  "Workout programs",
  "Lift logging",
  "Offline-first member app",
  "Attendance",
  "PT scheduling",
  "Renewals & billing",
  "Push notifications",
  "Progress charts",
  "Macro tracking",
  "Exercise video library"
];

type RoleKey = "owners" | "trainers" | "members";

const ROLES: Record<
  RoleKey,
  {
    tab: string;
    kicker: string;
    title: string;
    points: { strong: string; rest: string }[];
    stats: { label: string; value: string; accent?: string }[];
  }
> = {
  owners: {
    tab: "Owners",
    kicker: "Run the business",
    title: "The whole gym at a glance.",
    points: [
      { strong: "Renewals and payments", rest: " — see who's due, approve requests, and never chase a membership again." },
      { strong: "Live floor view", rest: " — today's roster, PT schedule, and which equipment is in demand." },
      { strong: "Member management", rest: " — onboard in minutes with PIN logins members actually use." }
    ],
    stats: [
      { label: "Renewals due this week", value: "6 members" },
      { label: "Active members", value: "128" },
      { label: "Attendance today", value: "42", accent: "↑ 12%" }
    ]
  },
  trainers: {
    tab: "Trainers",
    kicker: "Deliver the coaching",
    title: "Assign a split in seconds.",
    points: [
      { strong: "Reusable program templates", rest: " — build a split once, assign it to any member instantly." },
      { strong: "PT calendar", rest: " — bookings, reschedules, and session history in one view." },
      { strong: "Live session console", rest: " — log sets with the member and track every PT block." }
    ],
    stats: [
      { label: "Today's PT sessions", value: "5 booked" },
      { label: "Programs assigned", value: "34" },
      { label: "Next session", value: "6:30 pm", accent: "Rahul · Push" }
    ]
  },
  members: {
    tab: "Members",
    kicker: "Train with structure",
    title: "Open the app, see today's session.",
    points: [
      { strong: "Today's workout, ready", rest: " — exercises, targets, and video guides for every movement." },
      { strong: "Log every set — even offline", rest: " — poor gym signal never loses a rep; it syncs when you're back." },
      { strong: "Progress you can see", rest: " — lift charts, body metrics, and macros in one place." }
    ],
    stats: [
      { label: "This week", value: "4 of 5 days", accent: "on track" },
      { label: "Bench press", value: "+10 kg", accent: "in 8 weeks" },
      { label: "Today", value: "Push day" }
    ]
  }
};

const FEATURES = [
  { icon: "dumbbell", tag: "Owners & trainers", title: "Assign workouts faster", body: "Pick a saved split, pick a member, done. Programs sync to the member app instantly." },
  { icon: "calendar", tag: "Members", title: "Keep training structured", body: "Members get a clear weekly plan and today's session — not scattered notes or chat messages." },
  { icon: "chart", tag: "Members & coaches", title: "Track every set", body: "Lift logs, progressive-overload hints, body metrics, and macros — all in one place." },
  { icon: "users", tag: "Owners", title: "Coordinate the floor", body: "Live floor view, in-gym roster, PT schedule, and renewals — the owner sees everything." }
];

const STEPS = [
  { n: "01", label: "Build your library", body: "Reusable workout splits, exercises, and program templates." },
  { n: "02", label: "Assign in seconds", body: "Pick a plan for a member; they get it instantly in the app." },
  { n: "03", label: "Members follow along", body: "Today's session, targets, and check-offs on mobile." },
  { n: "04", label: "Track the floor", body: "Renewals, attendance, and payments — at a glance." }
];

const FAQ_ITEMS = [
  { q: "How long does setup take?", a: "Most gyms are live in under a week. Import your member list, build your first program templates, and you're delivering structured workouts." },
  { q: "Do you support mobile apps?", a: "Yes — native-feel web apps for members and trainers. PWA install works on iOS and Android." },
  { q: "Can I migrate from spreadsheets or chat?", a: "We import members from CSV. Programs are quick to build once and reused forever." },
  { q: "Is there a free trial?", a: "Yes. Add as many members as you want during the trial, no card required." }
];

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function useReveal(rootRef: React.RefObject<HTMLDivElement | null>) {
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
          <a className="lp-btn lp-btn--primary" href="#enquiry">
            Get FitSplit
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
        <span className="lp-chip lp-reveal" data-reveal>
          <span className="lp-chip__dot" />
          Workout delivery for modern gyms
        </span>
        <h1 className="lp-hero__title lp-reveal" data-reveal>
          Structured workouts, delivered to <em>every member.</em>
        </h1>
        <p className="lp-hero__sub lp-reveal" data-reveal>
          One focused workspace where gym owners assign plans, trainers guide sessions, and members train with
          structure — not scattered notes and chat threads.
        </p>
        <div className="lp-hero__ctas lp-reveal" data-reveal>
          <a className="lp-btn lp-btn--primary lp-btn--lg" href="#enquiry">
            Bring FitSplit to your gym <IconArrow />
          </a>
          <button type="button" className="lp-link-arrow" onClick={onLogin}>
            Sign in to your workspace <IconArrow />
          </button>
        </div>
        <p className="lp-hero__proof lp-reveal" data-reveal>
          <IconSpark />
          Running live at Sri Shakthi Hanuman Gym, Bengaluru
        </p>
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

function RoleShowcase() {
  const [active, setActive] = useState<RoleKey>("owners");
  const role = ROLES[active];
  const keys = Object.keys(ROLES) as RoleKey[];

  return (
    <section id="platform" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-section__head--center lp-reveal" data-reveal>
          <span className="lp-eyebrow">One platform · three roles</span>
          <h2 className="lp-h2">The whole gym, on one thread.</h2>
          <p className="lp-lede">
            FitSplit connects the people who run the gym to the people who train in it — pick a role to see their
            side of it.
          </p>
        </div>

        <div className="lp-roles__tabs lp-reveal" data-reveal role="tablist" aria-label="Choose a role">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`lp-role-tab-${key}`}
              aria-selected={active === key}
              aria-controls="lp-role-panel"
              className="lp-roles__tab"
              onClick={() => setActive(key)}
            >
              {ROLES[key].tab}
            </button>
          ))}
        </div>

        <div
          key={active}
          id="lp-role-panel"
          role="tabpanel"
          aria-labelledby={`lp-role-tab-${active}`}
          className="lp-roles__panel"
        >
          <div>
            <p className="lp-roles__kicker">{role.kicker}</p>
            <h3 className="lp-roles__title">{role.title}</h3>
            <ul className="lp-roles__list">
              {role.points.map((point) => (
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
          <div className="lp-roles__art" aria-hidden="true">
            {role.stats.map((stat) => (
              <div key={stat.label} className="lp-roles__stat">
                <span className="lp-roles__stat-label">{stat.label}</span>
                <span className="lp-roles__stat-value">
                  {stat.value}
                  {stat.accent && <em> · {stat.accent}</em>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-container">
        <div className="lp-section__head lp-section__head--center lp-reveal" data-reveal>
          <span className="lp-eyebrow">Features</span>
          <h2 className="lp-h2">Everything a coaching gym needs.</h2>
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
            Import your members, build your first templates, and start delivering structured workouts.
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
              Workout delivery, trainer coordination, and member progress — one workspace.
            </p>
          </div>
          <div className="lp-footer__col">
            <h4>Product</h4>
            <ul>
              <li><a href="#platform">Platform</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="lp-footer__col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
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
          <RoleShowcase />
          <Features />
          <HowItWorks />
          <FAQ />
          <EnquirySection />
        </main>
        <Footer onLogin={() => setLoginOpen(true)} />
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
