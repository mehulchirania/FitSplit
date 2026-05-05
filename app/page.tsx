import { LandingNav } from "@/components/landing-nav";
import { LoginForm } from "@/components/login-form";
import { SamplePlanDemo } from "@/components/sample-plan-demo";

export const dynamic = "force-dynamic";

const productPanels = [
  {
    eyebrow: "Trainer Dashboard",
    title: "Training operations at a glance",
    metric: "38",
    metricLabel: "active members",
    rows: ["12 plans assigned", "7 progress updates", "4 members training now"]
  },
  {
    eyebrow: "Member Workout Screen",
    title: "Today: Push strength",
    metric: "02:00",
    metricLabel: "rest timer",
    rows: ["Incline press · 4 x 8", "Set tracking", "Daily plan view"]
  },
  {
    eyebrow: "Progress Tracking",
    title: "Consistency that trainers can see",
    metric: "86%",
    metricLabel: "weekly completion",
    rows: ["6 day streak", "Lift history", "Progress graph"]
  }
];

const features = [
  ["Workout plan builder", "Create structured splits from reusable exercises and weekly templates."],
  ["Member assignment", "Assign the right plan to each member without sending screenshots or PDFs."],
  ["Progress tracking", "See logs, completion, rest flow, and lift history from one place."],
  ["Role-based access", "Owners, trainers, and members see only the tools they need."],
  ["No billing clutter", "FitSplit stays focused on workout delivery, not payments or memberships."],
  ["Mobile workout view", "Members get a clean daily workout screen built for the gym floor."]
];

export default function Home() {
  return (
    <main className="landing-page">
      <LandingNav />

      <section className="landing-hero" id="top">
        <div className="landing-hero-copy">
          <div className="landing-hero-brand" aria-label="FitSplit">
            <span className="theme-logo" aria-hidden="true">
              <img alt="" className="theme-logo-dark" src="/fitsplit-logo-dark.png" />
              <img alt="" className="theme-logo-light" src="/fitsplit-logo-light.png" />
            </span>
            <span>FitSplit</span>
          </div>
          <p className="eyebrow">Workout management for gyms and trainers</p>
          <h1>Assign better workouts. Track member progress. Keep training simple.</h1>
          <p>
            FitSplit helps gym owners and trainers create, assign, and monitor workout plans while members get a clean app experience to follow their daily training.
          </p>
          <div className="landing-actions">
            <a className="button button-primary" href="#login">
              Start Demo
            </a>
            <a className="button button-secondary" href="#login">
              View Member Experience
            </a>
          </div>
          <div className="landing-microcopy">Workout management without billing complexity.</div>
        </div>

        <div className="landing-hero-showcase">
          <div className="landing-hero-preview" aria-label="FitSplit app mockup">
            <div className="preview-shell-header">
              <span>FitSplit Command</span>
              <strong>⌘ Search member or plan</strong>
            </div>
            <div className="hero-command-card">
              <span>Assign plan</span>
              <strong>PPL x 2 → Rahul Sharma</strong>
            </div>
            <div className="preview-metrics">
              <div>
                <span>Members</span>
                <strong>38</strong>
              </div>
              <div>
                <span>Assigned</span>
                <strong>12</strong>
              </div>
              <div>
                <span>Streak</span>
                <strong>86%</strong>
              </div>
            </div>
            <div className="preview-plan-card">
              <span className="status-pill status-active">Live workout</span>
              <h2>Push strength</h2>
              <p>Incline press, shoulder press, triceps, rest timer, lift logging.</p>
            </div>
            <div className="preview-progress-card">
              <span>Weekly consistency</span>
              <div className="preview-bars">
                <i style={{ height: "48%" }} />
                <i style={{ height: "70%" }} />
                <i style={{ height: "62%" }} />
                <i style={{ height: "92%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="about">
        <div className="landing-section-heading">
          <p className="eyebrow">Who it is for</p>
          <h2>One system for trainers assigning plans and members following them.</h2>
        </div>
        <div className="landing-role-grid">
          <article>
            <span>Gym Owners / Trainers</span>
            <h3>Create, assign, and review progress.</h3>
            <p>Create plans, assign them to members, track progress, and keep every workout visible.</p>
          </article>
          <article>
            <span>Members</span>
            <h3>Follow the plan without confusion.</h3>
            <p>View assigned workouts, log sets, follow the daily plan, and keep training simple.</p>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Trainer control on one side. Member clarity on the other.</h2>
        </div>
        <div className="landing-timeline">
          <article>
            <h3>Trainer</h3>
            <p>Create plan</p>
            <p>Assign member</p>
            <p>Review progress</p>
          </article>
          <article>
            <h3>Member</h3>
            <p>Login</p>
            <p>Follow workout</p>
            <p>Log performance</p>
          </article>
        </div>
      </section>

      <section className="landing-section" id="demo">
        <SamplePlanDemo />
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Product previews</p>
          <h2>Realistic views for the workflows gyms repeat every day.</h2>
        </div>
        <div className="landing-product-grid">
          {productPanels.map((panel) => (
            <article key={panel.eyebrow}>
              <p className="eyebrow">{panel.eyebrow}</p>
              <h3>{panel.title}</h3>
              <div className="preview-ring">
                <strong>{panel.metric}</strong>
                <span>{panel.metricLabel}</span>
              </div>
              <div>
                {panel.rows.map((row) => (
                  <span key={row}>{row}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Features</p>
          <h2>A focused bento grid for workout delivery, not admin bloat.</h2>
        </div>
        <div className="landing-bento-grid">
          {features.map(([title, copy], index) => (
            <article className={index === 0 || index === 2 ? "is-wide" : ""} key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Before vs After</p>
          <h2>Replace scattered coaching with one clean training workspace.</h2>
        </div>
        <div className="before-after-grid">
          <article>
            <h3>Before FitSplit</h3>
            <p>WhatsApp messages</p>
            <p>Paper workout sheets</p>
            <p>No tracking</p>
            <p>Confused members</p>
          </article>
          <article>
            <h3>After FitSplit</h3>
            <p>Assigned workout plans</p>
            <p>Clean member login</p>
            <p>Progress visibility</p>
            <p>Trainer control</p>
          </article>
        </div>
      </section>

      <section className="landing-section about-contact-section">
        <div className="landing-section-heading">
          <p className="eyebrow">About + Contact</p>
          <h2>Built for practical gym workflows.</h2>
        </div>
        <div className="about-contact-grid">
          <article>
            <p>
              FitSplit is built by Mehul Chirania, a software developer focused on creating simple, practical tools for real gym workflows.
            </p>
            <p>
              The app is designed for gym owners and trainers who want a clean way to assign workout plans, manage member training, and track progress — without membership billing, payment systems, or unnecessary admin complexity.
            </p>
            <p>
              For demo access or feedback, contact Mehul Chirania.
            </p>
            <a href="tel:9688227039">9688227039</a>
          </article>
          <aside>
            <span className="theme-logo" aria-hidden="true">
              <img alt="" className="theme-logo-dark" src="/fitsplit-logo-dark.png" />
              <img alt="" className="theme-logo-light" src="/fitsplit-logo-light.png" />
            </span>
            <h3>Mehul Chirania</h3>
            <p>Developer of FitSplit</p>
            <span>Software Developer</span>
            <span>Bengaluru, India</span>
          </aside>
        </div>
      </section>

      <section className="landing-final-cta">
        <p className="eyebrow">Ready to make workout delivery easier?</p>
        <h2>Give trainers one place to assign plans and members one simple app to follow them.</h2>
        <div className="landing-actions">
          <a className="button button-primary" href="#login">
            Start Demo
          </a>
          <a className="button button-secondary" href="#login">
            Member Login
          </a>
        </div>
        <p>Workout management only. No billing or membership setup required.</p>
      </section>

      <section className="intro-login-band" id="login">
        <div className="intro-login-copy">
          <p className="eyebrow">Trainer or member access</p>
          <h2>Log in to your FitSplit workspace.</h2>
          <p>Trainers manage assigned plans. Members view and track the workouts already assigned to them.</p>
        </div>
        <LoginForm />
      </section>

      <footer className="landing-footer">© 2026 FitSplit. Made with 💪 by Mehul Chirania.</footer>
    </main>
  );
}
