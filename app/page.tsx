import { LoginForm } from "@/components/login-form";
import { SamplePlanDemo } from "@/components/sample-plan-demo";

export const dynamic = "force-dynamic";

const trainerFeatures = [
  "Create PPL, Upper/Lower, Bro Split, and custom workout plans",
  "Assign structured weekly plans to each member",
  "Review lift logs, progress signals, and workout completion"
];

const memberFeatures = [
  "Open the app and see today's assigned workout",
  "Follow clear exercise lists with sets, reps, and rest flow",
  "Track daily performance without leaving the workout screen"
];

const productPanels = [
  {
    eyebrow: "Trainer dashboard",
    title: "Member workload at a glance",
    rows: ["38 active members", "12 plans assigned this week", "7 progress updates pending"]
  },
  {
    eyebrow: "Member workout",
    title: "Today: Push strength",
    rows: ["Incline dumbbell press", "Machine shoulder press", "Cable tricep pressdown"]
  },
  {
    eyebrow: "Progress tracking",
    title: "Bench press trend",
    rows: ["Last week: 60kg x 8", "Today: 62.5kg x 8", "Next target: 65kg"]
  }
];

export default function Home() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-brand-lockup">
            <img alt="FitSplit" src="/icon-512.png" />
            <span>FitSplit</span>
          </div>
          <p className="eyebrow">Workout delivery for gyms</p>
          <h1>Manage your members' workouts in one place.</h1>
          <p>
            FitSplit helps gym owners and trainers create workout plans, assign them to members,
            and track training progress without mixing payments, memberships, or scattered chats.
          </p>
          <div className="landing-actions">
            <a className="button button-primary" href="#login">
              Start as Trainer
            </a>
            <a className="button button-secondary" href="#login">
              Member Login
            </a>
          </div>
          <div className="landing-proof-strip" aria-label="FitSplit proof points">
            <span>Built for Titan V2 Fitness pilot</span>
            <span>Role-based trainer/member access</span>
            <span>Workout planning only</span>
          </div>
        </div>

        <div className="landing-hero-preview" aria-label="FitSplit product preview">
          <div className="preview-shell-header">
            <span>Trainer workspace</span>
            <strong>Live week</strong>
          </div>
          <div className="preview-metrics">
            <div>
              <span>Members</span>
              <strong>38</strong>
            </div>
            <div>
              <span>Plans</span>
              <strong>12</strong>
            </div>
            <div>
              <span>Logs</span>
              <strong>124</strong>
            </div>
          </div>
          <div className="preview-plan-card">
            <span className="status-pill status-active">Assigned today</span>
            <h2>Push strength</h2>
            <p>Incline press, shoulder press, triceps, rest timer, lift logging.</p>
          </div>
          <div className="preview-progress-card">
            <span>Bench press</span>
            <div className="preview-bars">
              <i style={{ height: "42%" }} />
              <i style={{ height: "58%" }} />
              <i style={{ height: "72%" }} />
              <i style={{ height: "86%" }} />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-proof">
        <div>
          <strong>1 pilot gym</strong>
          <span>Designed around real owner workflows</span>
        </div>
        <div>
          <strong>5 proven splits</strong>
          <span>PPL, Bro Split, Upper/Lower, and custom plans</span>
        </div>
        <div>
          <strong>2 clear roles</strong>
          <span>Trainer control, member simplicity</span>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Who it is for</p>
          <h2>Built for the person assigning workouts and the member doing them.</h2>
        </div>
        <div className="landing-role-grid">
          <article>
            <span>Gym Owners / Trainers</span>
            <h3>Build programs once, deliver them cleanly.</h3>
            <p>Create structured splits, assign them to members, and see training activity from one workspace.</p>
          </article>
          <article>
            <span>Members</span>
            <h3>Open the app and know exactly what to train.</h3>
            <p>Members see their assigned weekly schedule, today's exercises, rest timer, and lift log.</p>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Two simple flows, one shared training system.</h2>
        </div>
        <div className="landing-flow-grid">
          <article>
            <h3>Trainer flow</h3>
            <ol>
              <li>Create workout plans from the exercise catalog.</li>
              <li>Assign plans to the right member.</li>
              <li>Track lift logs and completion signals.</li>
            </ol>
          </article>
          <article>
            <h3>Member flow</h3>
            <ol>
              <li>Log in with member access.</li>
              <li>View today's assigned workout.</li>
              <li>Track performance set by set.</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Role-based features</p>
          <h2>Less admin noise. More training delivery.</h2>
        </div>
        <div className="landing-feature-grid">
          <article>
            <h3>For trainers</h3>
            {trainerFeatures.map((feature) => (
              <p key={feature}>{feature}</p>
            ))}
          </article>
          <article>
            <h3>For members</h3>
            {memberFeatures.map((feature) => (
              <p key={feature}>{feature}</p>
            ))}
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <p className="eyebrow">Product preview</p>
          <h2>Proof that this is a gym tool, not a generic fitness feed.</h2>
        </div>
        <div className="landing-product-grid">
          {productPanels.map((panel) => (
            <article key={panel.eyebrow}>
              <p className="eyebrow">{panel.eyebrow}</p>
              <h3>{panel.title}</h3>
              <div>
                {panel.rows.map((row) => (
                  <span key={row}>{row}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="demo">
        <SamplePlanDemo />
      </section>

      <section className="landing-section landing-testimonials">
        <div className="landing-section-heading">
          <p className="eyebrow">Trainer-focused proof</p>
          <h2>Designed for gyms that already coach members manually.</h2>
        </div>
        <div className="landing-role-grid">
          <article>
            <p>"FitSplit gives every member a clear plan without forcing us into a payment system we do not need."</p>
            <strong>Titan V2 Fitness pilot</strong>
          </article>
          <article>
            <p>"The value is simple: trainers assign the plan, members follow it, progress stays visible."</p>
            <strong>Owner workflow note</strong>
          </article>
        </div>
      </section>

      <section className="landing-final-cta">
        <p className="eyebrow">Ready to deliver better workouts?</p>
        <h2>Start managing workout plans with FitSplit.</h2>
        <div className="landing-actions">
          <a className="button button-primary" href="#login">
            Start Managing Workouts
          </a>
          <a className="button button-secondary" href="#demo">
            Try Demo
          </a>
        </div>
      </section>

      <section className="intro-login-band" id="login">
        <div className="intro-login-copy">
          <p className="eyebrow">Trainer or member access</p>
          <h2>Log in to your FitSplit workspace.</h2>
          <p>
            Trainers manage assigned plans. Members view and track the workouts already assigned to them.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
