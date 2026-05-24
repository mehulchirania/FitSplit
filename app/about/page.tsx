import Link from "next/link";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { Activity, Mail, Dumbbell } from "@/components/icons";
import { requireAuth } from "@/lib/auth";
import { submitContactMessage } from "@/lib/firebase/actions";
import { getGymDetail } from "@/lib/firebase/read-models";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const currentUser = await requireAuth();
  const { gym } = await getGymDetail(currentUser.gymId);

  const socialLinks = [
    gym?.instagram ? { label: "Instagram", mark: "IG", href: gym.instagram.startsWith("http") ? gym.instagram : `https://instagram.com/${gym.instagram.replace(/^@/, "")}` } : null,
    gym?.linkedin ? { label: "LinkedIn", mark: "IN", href: gym.linkedin.startsWith("http") ? gym.linkedin : `https://linkedin.com/company/${gym.linkedin}` } : null,
    gym?.youtube ? { label: "YouTube", mark: "YT", href: gym.youtube.startsWith("http") ? gym.youtube : `https://youtube.com/${gym.youtube}` } : null,
    gym?.email ? { label: "Email", mark: "@", href: `mailto:${gym.email}` } : null
  ].filter(Boolean) as { label: string; mark: string; href: string }[];

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
              <Activity /> Gym workspace
            </h2>
            <span className="status-pill status-active">{gym?.name ?? "Your Gym"}</span>
          </div>
          <p>
            Built to support active gym workspaces where AI acts like a
            Semi-Personal Trainer for every member.
          </p>
        </aside>
      </section>

      <section className="content-grid" style={{ marginBottom: 40 }}>
        <aside className="summary-panel" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <div>
            <div className="panel-title">
              <h2>
                <Dumbbell /> Exercise Demonstration Credits
              </h2>
            </div>
            <p style={{ marginTop: 16 }}>
              All exercise demonstration videos in the FitSplit catalog are sourced and curated from the official <strong>@DeltaBolic</strong> YouTube channel. We sincerely appreciate their dedication to providing high-quality, verified instructional fitness content which powers our Semi-Personal Trainer experience.
            </p>
            <a href="https://www.youtube.com/@DeltaBolic" target="_blank" className="button button-secondary" style={{ marginTop: 24, display: "inline-flex" }}>
              Visit @DeltaBolic on YouTube
            </a>
          </div>
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
              Mobile number
              <input name="mobile" placeholder="+91 ..." required />
            </label>
            <label>
              Message
              <input name="body" placeholder="What do you need?" required />
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
