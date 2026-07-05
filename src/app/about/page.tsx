import Link from "next/link";

export const metadata = {
  title: "About | FitSplit",
};

export default function AboutPage() {
  return (
    <div className="lpd-container" style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "80px" }}>
      <header style={{ marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="lp-modal-brand" style={{ textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--fg)" }}>FitSplit</span>
        </Link>
        <Link href="/" style={{ color: "var(--fg-dim)", textDecoration: "none" }}>
          Back to home
        </Link>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 className="lpd-h2" style={{ marginBottom: "24px" }}>About FitSplit</h1>
        <div style={{ fontSize: "1.125rem", color: "var(--fg-dim)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: "20px" }}>
            FitSplit was built to give gym owners, trainers, and members a single, focused workspace
            to assign plans, guide sessions, and track progress without stitching together spreadsheets and messaging apps.
          </p>
          <p style={{ marginBottom: "20px" }}>
            FitSplit is owned and operated by{" "}
            <a
              href="https://blumelabs.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              Blume Labs
            </a>
            .
          </p>
          <p style={{ marginBottom: "20px" }}>
            Developed by <strong>Mehul</strong>.
          </p>
          <p style={{ marginBottom: "20px" }}>
            For any enquiries, please write to us at <a href="mailto:fitsplit.in@gmail.com" style={{ color: "var(--accent)" }}>fitsplit.in@gmail.com</a>.
          </p>
          <p>
            Read our <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link> and{" "}
            <Link href="/terms" style={{ color: "var(--accent)" }}>Terms of Service</Link> to learn how
            we handle your data and the rules for using FitSplit.
          </p>
        </div>
      </main>
    </div>
  );
}
