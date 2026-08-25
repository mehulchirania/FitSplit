import type { Metadata } from "next";
import Link from "next/link";
import { ConsumerSignupForm } from "@/components/onboarding/consumer-signup-form";

export const metadata: Metadata = {
  title: "Sign Up Free — FitSplit",
  description: "Start tracking your workouts, progressive overload, and body metrics with FitSplit. Free forever."
};

export default function SignupPage() {
  return (
    <div style={styles.pageWrap}>
      {/* Brand Header */}
      <div style={styles.brandHeader}>
        <Link href="/" style={styles.brandLogo}>
          Fit<span style={styles.brandAccent}>Split</span>
        </Link>
      </div>

      {/* Main Form Container */}
      <main style={styles.main}>
        <ConsumerSignupForm />
      </main>

      {/* Minimal Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerLinks}>
          <Link href="/terms" style={styles.footerLink}>Terms</Link>
          <Link href="/privacy" style={styles.footerLink}>Privacy</Link>
          <Link href="/disclaimer" style={styles.footerLink}>Health Disclaimer</Link>
        </div>
        <p style={styles.copyright}>© {new Date().getFullYear()} FitSplit Technologies. All rights reserved.</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0A0A0C",
    backgroundImage: "radial-gradient(ellipse at 50% -10%, rgba(200, 241, 53, 0.12) 0%, transparent 60%)",
    color: "#FFFFFF",
    fontFamily: "var(--font-inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    padding: "24px 16px"
  },
  brandHeader: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px 0 32px 0"
  },
  brandLogo: {
    fontSize: "26px",
    fontWeight: "900",
    color: "#FFFFFF",
    textDecoration: "none",
    letterSpacing: "-0.03em"
  },
  brandAccent: {
    color: "#C8F135"
  },
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "auto",
    width: "100%",
    maxWidth: "480px"
  },
  footer: {
    padding: "32px 0 16px 0",
    textAlign: "center",
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)"
  },
  footerLinks: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "8px"
  },
  footerLink: {
    color: "rgba(255,255,255,0.6)",
    textDecoration: "none"
  },
  copyright: {
    margin: 0
  }
};
