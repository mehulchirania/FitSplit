import Link from "next/link";
import { Activity, Bell } from "@/components/icons";
import { submitContactMessage } from "@/lib/firebase/actions";
import { getSiteLinks } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { links } = await getSiteLinks();

  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">About</p>
          <h1>FitSplit for focused gym operations.</h1>
          <p>
            FitSplit helps a gym owner manage memberships, renewal alerts,
            workout programs, exercise catalogs, and an automated Semi-Personal
            Trainer experience for member-facing schedules.
          </p>
        </div>
        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <Activity /> Pilot scope
            </h2>
            <span className="status-pill status-active">Titan V2 Fitness</span>
          </div>
          <p>
            Built as a single-gym pilot with Firebase-backed data and room to
            expand into multi-workspace operations where AI acts like a
            Semi-Personal Trainer for every member.
          </p>
        </aside>
      </section>

      <section className="content-grid">
        <form action={submitContactMessage} className="form-panel">
          <h2>Get in touch</h2>
          <div className="form-grid">
            <label>
              Name
              <input name="name" placeholder="Your name" required />
            </label>
            <label>
              Number
              <input name="number" placeholder="+91 ..." required />
            </label>
            <label>
              Requirement
              <input name="requirement" placeholder="What do you need?" required />
            </label>
            <label>
              Email
              <input name="email" placeholder="you@example.com" type="email" />
            </label>
          </div>
          <button className="button button-primary" type="submit">
            Send message
          </button>
        </form>

        <aside className="list-panel links-panel">
          <div className="panel-title">
            <h2>
              <Bell /> Links
            </h2>
          </div>
          {links.map((link) =>
            link.href.startsWith("mailto:") ? (
              <a href={link.href} key={link.id}>
                {link.label}
              </a>
            ) : (
              <Link href={link.href} key={link.id}>
                {link.label}
              </Link>
            )
          )}
        </aside>
      </section>

      <footer className="app-footer">Developed with ❤️ by Mehul</footer>
    </main>
  );
}
