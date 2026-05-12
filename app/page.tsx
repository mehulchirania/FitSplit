import { ContactForm } from "@/components/contact-form";
import { LandingNav } from "@/components/landing-nav";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

const featureGroups = [
  {
    eyebrow: "Members",
    title: "Everything members need",
    copy: "Daily workouts, exercise guidance, attendance, lift logs, and progress history in a simple mobile-first view."
  },
  {
    eyebrow: "Trainers",
    title: "Built for trainers and owners",
    copy: "Create programs, assign members, review training activity, and keep coaching organized without billing clutter."
  },
  {
    eyebrow: "System",
    title: "A smarter fitness ecosystem",
    copy: "Role-based access, Firestore-backed activity, injury notes, attendance signals, and room for AI-assisted programming."
  }
];

const previewCards = [
  ["Attendance", "Live check-ins", "18 active now"],
  ["Planner", "PPL x 2 assigned", "6 day split"],
  ["Trainer dashboard", "Members by trainer", "5 updates today"],
  ["Analytics", "Weekly consistency", "86% completion"],
  ["Member profile", "Goals and injury notes", "Trainer visible"],
  ["Progress", "Bench press history", "+2.5 kg"]
];

const partners = [
  {
    name: "Sri Shakthi Hanuman Gym",
    logo: "/shg-gym-logo.jpeg"
  }
];

const marqueePartners = Array.from({ length: 12 }, (_, index) => partners[index % partners.length]);

export default function Home() {
  return (
    <main className="landing-page premium-landing">
      <LandingNav />

      <section className="premium-hero" id="top">
        <div className="premium-hero-bg" aria-hidden="true" />
        <div className="premium-hero-copy reveal-on-scroll">
          <div className="landing-hero-brand" aria-label="FitSplit">
            <span className="theme-logo" aria-hidden="true">
              <img alt="" className="theme-logo-dark" src="/fitsplit-logo-dark.png" />
              <img alt="" className="theme-logo-light" src="/fitsplit-logo-light.png" />
            </span>
            <span>FitSplit</span>
          </div>
          <p className="eyebrow">Premium workout delivery for modern gyms</p>
          <h1>Train members with clarity, consistency, and control.</h1>
          <p>
            FitSplit gives gym owners and trainers one polished workspace to create workout plans,
            assign them to members, and track progress without membership or billing complexity.
          </p>
          <div className="landing-actions">
            <a className="button button-primary" href="#login">
              Start Demo
            </a>
            <a className="button button-secondary" href="#previews">
              View Product
            </a>
          </div>
        </div>

        <div className="premium-hero-device reveal-on-scroll" aria-label="FitSplit product preview">
          <div className="device-toolbar">
            <span />
            <strong>Trainer Command</strong>
            <em>Live</em>
          </div>
          <div className="device-grid">
            <article>
              <span>Active members</span>
              <strong>38</strong>
            </article>
            <article>
              <span>Plans assigned</span>
              <strong>24</strong>
            </article>
            <article>
              <span>Training now</span>
              <strong>18</strong>
            </article>
          </div>
          <div className="device-plan">
            <div>
              <span>Today</span>
              <strong>Push Strength</strong>
            </div>
            <p>Incline press / shoulder press / triceps / logged sets</p>
          </div>
          <div className="device-chart" aria-hidden="true">
            <i style={{ height: "38%" }} />
            <i style={{ height: "62%" }} />
            <i style={{ height: "54%" }} />
            <i style={{ height: "82%" }} />
            <i style={{ height: "74%" }} />
            <i style={{ height: "92%" }} />
          </div>
        </div>
      </section>

      <section className="premium-section product-overview" id="overview">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">Product overview</p>
          <h2>A calm operating system for workout planning and delivery.</h2>
          <p>
            Built around the actual trainer-to-member workflow: plan, assign, follow,
            log, and review.
          </p>
        </div>
        <div className="overview-strip reveal-on-scroll">
          <span>Create workout plans</span>
          <span>Assign members</span>
          <span>Track attendance</span>
          <span>Review progress</span>
        </div>
      </section>

      <section className="premium-section" id="features">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">Features</p>
          <h2>Everything important, grouped by how gyms actually work.</h2>
        </div>
        <div className="premium-feature-grid">
          {featureGroups.map((feature) => (
            <article className="premium-card reveal-on-scroll" key={feature.title}>
              <span>{feature.eyebrow}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-section" id="previews">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">App previews</p>
          <h2>Real product surfaces for trainers, members, and admins.</h2>
        </div>
        <div className="preview-showcase">
          {previewCards.map(([label, title, metric]) => (
            <article className="preview-card reveal-on-scroll" key={label}>
              <span>{label}</span>
              <h3>{title}</h3>
              <strong>{metric}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="premium-section trainer-admin-section">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">Trainer and admin overview</p>
          <h2>Separate access for the people running the gym and the members training inside it.</h2>
        </div>
        <div className="role-flow reveal-on-scroll">
          <article>
            <h3>Owners and trainers</h3>
            <p>Manage members, plans, staff, activity, inbox messages, and gym-level settings.</p>
          </article>
          <article>
            <h3>Members</h3>
            <p>Open the app, view today's workout, start attendance, log lifts, and track progress.</p>
          </article>
        </div>
      </section>

      <section className="premium-section partners-section" id="partners">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">Our Partners</p>
          <h2>Trusted by premium fitness centers and growing gym communities.</h2>
        </div>
        <div className="partner-marquee reveal-on-scroll" aria-label="FitSplit partners">
          <div className="partner-track">
            {marqueePartners.map((partner, index) => (
              <article className="partner-card" key={`${partner.name}-${index}`}>
                <img alt={partner.name} src={partner.logo} />
                <span>{partner.name}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="premium-section trust-section">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">Trust</p>
          <h2>Less confusion on the floor. More visibility for coaches.</h2>
        </div>
        <div className="trust-grid">
          <article className="premium-card reveal-on-scroll">
            <strong>86%</strong>
            <span>weekly workout completion visibility</span>
          </article>
          <article className="premium-card reveal-on-scroll">
            <strong>2 min</strong>
            <span>to assign a structured plan to a member</span>
          </article>
          <article className="premium-card reveal-on-scroll">
            <strong>0</strong>
            <span>billing screens cluttering the training workflow</span>
          </article>
        </div>
      </section>

      <section className="premium-section contact-section" id="contact">
        <div className="premium-section-heading reveal-on-scroll">
          <p className="eyebrow">Contact</p>
          <h2>Want FitSplit for your gym?</h2>
          <p>Send a message for demo access, setup questions, or product feedback.</p>
        </div>
        <div className="premium-contact-panel reveal-on-scroll">
          <ContactForm />
        </div>
      </section>

      <section className="premium-final-cta reveal-on-scroll">
        <p className="eyebrow">Ready to simplify workout delivery?</p>
        <h2>Give trainers one place to assign plans and members one simple app to follow them.</h2>
        <div className="landing-actions">
          <a className="button button-primary" href="#login">
            Start Demo
          </a>
          <a className="button button-secondary" href="#contact">
            Contact Us
          </a>
        </div>
      </section>

      <section className="intro-login-band premium-login-band" id="login">
        <div className="intro-login-copy reveal-on-scroll">
          <p className="eyebrow">Login</p>
          <h2>Access your FitSplit workspace.</h2>
          <p>Members use their mobile/email and PIN. Staff use their assigned username and password.</p>
        </div>
        <LoginForm />
      </section>

      <footer className="premium-landing-footer">
        <span>FitSplit</span>
        <span>Workout management only. No billing or membership setup required.</span>
      </footer>
    </main>
  );
}
