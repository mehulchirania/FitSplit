import Link from "next/link";

export const metadata = {
  title: "Account Suspended — FitSplit",
  description: "Your FitSplit account has been deactivated."
};

export default function SuspendedPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80dvh",
        padding: "2rem",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "1.25rem",
          lineHeight: 1
        }}
        aria-hidden
      >
        🔒
      </div>

      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
          color: "var(--color-text, #f0f0f0)"
        }}
      >
        Account Deactivated
      </h1>

      <p
        style={{
          color: "var(--color-text-secondary, #a0a0a0)",
          maxWidth: "22rem",
          lineHeight: 1.6,
          marginBottom: "2rem"
        }}
      >
        Your FitSplit account has been deactivated. Please contact your gym
        owner or trainer to have your access restored.
      </p>

      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "0.6rem 1.5rem",
          background: "var(--color-accent, #6d28d9)",
          color: "#fff",
          borderRadius: "0.5rem",
          fontWeight: 600,
          textDecoration: "none",
          fontSize: "0.9375rem"
        }}
      >
        Back to Login
      </Link>
    </main>
  );
}
