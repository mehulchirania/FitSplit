import Link from "next/link";
import { Activity, Bell, CalendarDays, Dumbbell, UsersRound } from "@/components/icons";
import {
  getMembersWithMemberships,
  getOwnerNotifications,
  getWorkoutPrograms
} from "@/lib/firebase/read-models";

const workstreams = [
  {
    title: "Memberships",
    body: "Track start dates, calculated end dates, expiring members, and expired members.",
    icon: CalendarDays
  },
  {
    title: "Workout Programs",
    body: "Use the AI Semi-Personal Trainer to adapt structured plans around goals, injuries, and owner review.",
    icon: Dumbbell
  },
  {
    title: "Owner Alerts",
    body: "Surface renewals that need attention before revenue quietly slips away.",
    icon: Bell
  }
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ members }, { notifications }, { programs }] = await Promise.all([
    getMembersWithMemberships(),
    getOwnerNotifications(),
    getWorkoutPrograms()
  ]);

  return (
    <main className="home">
      <section className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">Single-gym pilot</p>
          <h1>FitSplit</h1>
          <p>
            A focused gym management app for memberships, assigned workout plans,
            exercise videos, renewal alerts, and an automated Semi-Personal
            Trainer layer.
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
              <strong>{members.length}</strong>
              Pilot members
            </span>
            <span>
              <strong>{notifications.length}</strong>
              Renewal alerts
            </span>
            <span>
              <strong>{programs.length}</strong>
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
          <h2>Automated Semi-Personal Trainer</h2>
          <p>
            AI-generated workout changes are framed as semi-personal coaching:
            fast member support, safer exercise substitutions, and owner review
            before the gym scales the experience.
          </p>
        </div>
        <UsersRound />
      </section>
    </main>
  );
}
