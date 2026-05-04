import Link from "next/link";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Activity, Mail } from "@/components/icons";
import { submitContactMessage } from "@/lib/firebase/actions";

const socialLinks = [
  { label: "Instagram", mark: "IG", href: "https://www.instagram.com" },
  { label: "LinkedIn", mark: "IN", href: "https://www.linkedin.com" },
  { label: "YouTube", mark: "YT", href: "https://www.youtube.com" },
  { label: "Email", mark: "@", href: "mailto:mehul@example.com" }
];

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  return (
    <main className="page">
      <section className="dashboard-header compact-header">
        <div className="header-copy">
          <p className="eyebrow">About</p>
          <h1>FitSplit for focused gym operations.</h1>
          <p>
            FitSplit helps a gym owner manage members, workout programs,
            exercise catalogs, and an automated Semi-Personal Trainer
            experience for member-facing schedules.
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
            Built as a single-gym pilot with room to expand into multi-gym
            operations where AI acts like a Semi-Personal Trainer for every
            member.
          </p>
        </aside>
      </section>

      <section className="content-grid">
        <ConfirmActionForm
          action={submitContactMessage}
          className="form-panel"
          confirmMessage="This will save your message so the FitSplit team can follow up."
          confirmTitle="Send this message?"
          pendingLabel="Sending message..."
          submitLabel="Send message"
        >
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
        </ConfirmActionForm>

        <aside className="summary-panel">
          <div className="panel-title">
            <h2>
              <Mail /> Contact
            </h2>
          </div>
          <p>
            Use the form for gym setup, customization, workout data, or AI
            Semi-Personal Trainer requirements.
          </p>
        </aside>
      </section>

      <nav className="social-links" aria-label="Social links">
        {socialLinks.map((link) => (
          <Link
            aria-label={link.label}
            href={link.href}
            key={link.label}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
          >
            {link.mark}
          </Link>
        ))}
      </nav>
    </main>
  );
}
