import Link from "next/link";
import { Activity, Bell, CalendarDays, Dumbbell, UsersRound } from "@/components/icons";

const workstreams = [
  {
    title: "Memberships",
    body: "Track start dates, calculated end dates, expiring members, and expired members.",
    icon: CalendarDays
  },
  {
    title: "Workout Programs",
    body: "Build structured programs with days, exercises, notes, and demonstration videos.",
    icon: Dumbbell
  },
  {
    title: "Owner Alerts",
    body: "Surface renewals that need attention before revenue quietly slips away.",
    icon: Bell
  }
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">Single-gym pilot</p>
          <h1>FitSplit</h1>
          <p>
            A focused gym management app for memberships, assigned workout plans,
            exercise videos, and renewal alerts.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/owner">
              Owner dashboard
            </Link>
            <Link className="button button-secondary" href="/member">
              Member view
            </Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="Pilot gym snapshot">
          <div className="metric-strip">
            <span>
              <strong>4</strong>
              Pilot members
            </span>
            <span>
              <strong>2</strong>
              Renewal alerts
            </span>
            <span>
              <strong>1</strong>
              Active program
            </span>
          </div>
          <div className="training-image" />
        </div>
      </section>

      <section className="workstream-grid" aria-label="Core product areas">
        {workstreams.map((item) => {
          const Icon = item.icon;
          return (
            <article className="feature-card" key={item.title}>
              <Icon />
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>

      <section className="ai-band">
        <Activity />
        <div>
          <h2>AI-ready by design</h2>
          <p>
            The app keeps AI-generated programs in a draft state for owner review,
            so Claude can assist without bypassing professional judgment.
          </p>
        </div>
        <UsersRound />
      </section>
    </main>
  );
}
