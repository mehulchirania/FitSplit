import Link from "next/link";

export const metadata = {
  title: "Terms of Service | FitSplit",
  description:
    "The terms that govern your use of the FitSplit gym-management platform, including health-and-fitness disclaimers and your responsibilities.",
};

// Keep this in sync with the date the terms text last changed.
const LAST_UPDATED = "June 5, 2026";
const CONTACT_EMAIL = "fitsplit.in@gmail.com";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: "40px", scrollMarginTop: "90px" }}>
      <h2 className="lpd-h2" style={{ fontSize: "1.4rem", marginBottom: "14px" }}>
        {title}
      </h2>
      <div style={{ fontSize: "1.03rem", color: "var(--fg-dim)", lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const linkStyle = { color: "var(--accent)", textDecoration: "none" } as const;

  return (
    <div className="lpd-container" style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "80px" }}>
      <header
        style={{
          marginBottom: "48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" className="lp-modal-brand" style={{ textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new_logo.png" alt="FitSplit" width="52" height="22" />
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--fg)" }}>FitSplit</span>
        </Link>
        <Link href="/" style={{ color: "var(--fg-dim)", textDecoration: "none" }}>
          Back to home
        </Link>
      </header>

      <main style={{ maxWidth: "760px", margin: "0 auto" }}>
        <h1 className="lpd-h2" style={{ marginBottom: "8px" }}>
          Terms of Service
        </h1>
        <p style={{ color: "var(--fg-dim)", marginBottom: "8px" }}>Last updated: {LAST_UPDATED}</p>
        <p style={{ color: "var(--fg-dim)", lineHeight: 1.65, marginBottom: "36px" }}>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the FitSplit
          gym-management platform (&ldquo;FitSplit&rdquo;, the &ldquo;Service&rdquo;). By creating an
          account, logging in, or otherwise using the Service, you agree to these Terms. If you do not
          agree, do not use the Service.
        </p>

        <Section id="eligibility" title="1. Eligibility">
          <p>
            You must be at least 16 years old (or the minimum age in your jurisdiction) to use
            FitSplit. By using the Service you represent that you meet this requirement and that the
            information you provide is accurate. Member accounts are created and managed by the gym you
            belong to.
          </p>
        </Section>

        <Section id="accounts" title="2. Your account and security">
          <p>
            You are responsible for keeping your credentials (password or PIN) confidential and for all
            activity under your account. Notify your gym owner or us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>
              {CONTACT_EMAIL}
            </a>{" "}
            promptly if you suspect unauthorized access. We may suspend accounts that appear
            compromised or misused.
          </p>
        </Section>

        <Section id="roles" title="3. Gyms, staff, and members">
          <p>
            FitSplit is a multi-tenant platform. Each gym controls its own members, programs, and
            settings, and is responsible for how it uses member data and for any content it publishes.
            FitSplit provides the software; it is not a party to the relationship between a gym and its
            members, trainers, or staff.
          </p>
        </Section>

        <Section id="acceptable-use" title="4. Acceptable use">
          <p style={{ marginBottom: "10px" }}>You agree not to:</p>
          <ul style={{ paddingLeft: "20px", display: "grid", gap: "6px" }}>
            <li>access data or accounts that are not yours, or attempt to bypass security or tenant isolation;</li>
            <li>upload unlawful, infringing, or malicious content, or files that are not legitimate exercise media;</li>
            <li>scrape, reverse-engineer, overload, or disrupt the Service or its infrastructure;</li>
            <li>use the Service to harass others or violate any applicable law.</li>
          </ul>
        </Section>

        <Section id="health" title="5. Health and fitness disclaimer">
          <p style={{ marginBottom: "12px" }}>
            <strong>
              FitSplit is a fitness-tracking and gym-operations tool, not a medical service.
            </strong>{" "}
            Workout programs, insights, macros, and coaching notes are for general informational
            purposes and are <strong>not medical advice</strong>.
          </p>
          <p>
            Consult a qualified physician before starting any exercise or nutrition program,
            especially if you have an injury or medical condition. You exercise at your own risk, and
            you (and where applicable your gym and trainers) are solely responsible for decisions made
            using the Service. To the fullest extent permitted by law, FitSplit is not liable for any
            injury, health outcome, or loss arising from use of the Service.
          </p>
        </Section>

        <Section id="data" title="6. Your data and privacy">
          <p>
            Our handling of personal and health data is described in our{" "}
            <Link href="/privacy" style={linkStyle}>
              Privacy Policy
            </Link>
            , which forms part of these Terms. By using the Service you consent to that processing,
            including the processing of fitness-related data, and you may withdraw consent as described
            there.
          </p>
        </Section>

        <Section id="ip" title="7. Intellectual property and your content">
          <p>
            FitSplit and its software, design, and trademarks are owned by us or our licensors and are
            protected by law. You retain ownership of the content you submit (e.g. logs, notes, media),
            and you grant FitSplit and your gym a limited license to host, process, and display that
            content solely to operate the Service for you.
          </p>
        </Section>

        <Section id="availability" title="8. Availability and changes to the Service">
          <p>
            We work to keep FitSplit available and reliable, but the Service is provided on an
            &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. We
            may add, change, or remove features, and may perform maintenance that temporarily
            interrupts access.
          </p>
        </Section>

        <Section id="billing" title="9. Memberships and fees">
          <p>
            Membership packages, prices, and payments are set and collected by your gym; FitSplit
            records membership status but does not itself process card payments. Any fees FitSplit
            charges a gym for the platform are governed by a separate agreement with that gym.
          </p>
        </Section>

        <Section id="liability" title="10. Disclaimers and limitation of liability">
          <p>
            To the fullest extent permitted by law, FitSplit and its operators are not liable for any
            indirect, incidental, special, or consequential damages, or for loss of data, profits, or
            goodwill, arising from your use of the Service. Where liability cannot be excluded, it is
            limited to the amount you paid us (if any) for the Service in the 12 months before the
            claim. Nothing in these Terms limits liability that cannot be limited under applicable law.
          </p>
        </Section>

        <Section id="termination" title="11. Suspension and termination">
          <p>
            You may stop using the Service at any time and request deletion of your data (see the{" "}
            <Link href="/privacy" style={linkStyle}>
              Privacy Policy
            </Link>
            ). We or your gym may suspend or terminate access for breach of these Terms, suspected
            abuse, or where required by law. Provisions that by their nature should survive termination
            (e.g. disclaimers, liability limits) will continue to apply.
          </p>
        </Section>

        <Section id="law" title="12. Governing law">
          <p>
            These Terms are governed by the laws of India, without regard to conflict-of-laws rules.
            Courts located in India will have jurisdiction, unless mandatory local consumer-protection
            law in your country of residence provides otherwise.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to these Terms">
          <p>
            We may update these Terms from time to time. We will revise the &ldquo;Last updated&rdquo;
            date above and, for material changes, provide more prominent notice. Continued use after an
            update means you accept the revised Terms.
          </p>
        </Section>

        <Section id="contact" title="14. Contact us">
          <p>
            Questions about these Terms? Write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link href="/privacy" style={linkStyle}>
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/about" style={linkStyle}>
              About page
            </Link>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}
