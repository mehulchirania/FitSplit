import Link from "next/link";

export const metadata = {
  title: "About | FitSplit",
};

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-header">
        <Link href="/" className="about-brand" aria-label="FitSplit home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
          <span>FitSplit</span>
        </Link>
        <Link href="/" className="about-back">
          Back to home
        </Link>
      </header>

      <main className="about-shell">
        <h1 className="about-h1">About FitSplit</h1>
        <div className="about-body">
          <p>
            FitSplit was built to give gym owners, trainers, and members a single, focused workspace
            to assign plans, guide sessions, and track progress without stitching together spreadsheets and messaging apps.
          </p>
          <p>
            FitSplit is owned and operated by{" "}
            <a href="https://blumelabs.in" target="_blank" rel="noopener noreferrer">
              Blume Labs
            </a>
            .
          </p>
          <p>
            Developed by <strong>Mehul</strong>.
          </p>
          <p>
            For any enquiries, please write to us at <a href="mailto:fitsplit.in@gmail.com">fitsplit.in@gmail.com</a>.
          </p>
          <p>
            Read our <Link href="/privacy">Privacy Policy</Link> and{" "}
            <Link href="/terms">Terms of Service</Link> to learn how
            we handle your data and the rules for using FitSplit.
          </p>
        </div>
      </main>

      <style>{`
        .about-page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }
        .about-header {
          align-items: center;
          border-bottom: 1px solid var(--border);
          background: var(--surface-glass);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          gap: var(--space-6);
          justify-content: space-between;
          padding: var(--space-4) clamp(var(--space-5), 5vw, var(--space-12));
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .about-brand {
          align-items: center;
          color: var(--text);
          display: inline-flex;
          font-weight: 800;
          font-size: var(--text-md);
          gap: var(--space-2);
          text-decoration: none;
        }
        .about-brand img {
          display: block;
          height: auto;
          width: 52px;
        }
        .about-back {
          color: var(--text-soft);
          font-size: var(--text-sm);
          text-decoration: none;
          transition: color var(--fast);
        }
        .about-back:hover {
          color: var(--text);
        }
        .about-page :focus-visible {
          outline: 2px solid var(--brand);
          outline-offset: 2px;
          border-radius: var(--radius-xs);
        }
        .about-shell {
          margin: 0 auto;
          max-width: 68ch;
          padding: var(--space-20) var(--space-5) var(--space-24);
        }
        .about-h1 {
          margin: 0 0 var(--space-6);
          font-size: var(--text-3xl);
        }
        .about-body {
          color: var(--text-soft);
          font-size: var(--text-md);
          line-height: var(--leading-relaxed);
        }
        .about-body p {
          margin: 0 0 var(--space-5);
          color: inherit;
        }
        .about-body p:last-child {
          margin-bottom: 0;
        }
        .about-body strong {
          color: var(--text);
        }
        .about-body a {
          color: var(--brand);
          text-decoration: underline;
          text-underline-offset: 2px;
          font-weight: 600;
        }
        .about-body a:hover {
          color: var(--brand-strong);
        }
        @media (max-width: 480px) {
          .about-header {
            gap: var(--space-3);
          }
          .about-brand span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
