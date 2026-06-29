import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_LINE, LEGAL_OPERATOR_NAME } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy | FitSplit",
  description:
    "How FitSplit collects, uses, shares, and protects personal data, including your rights under the GDPR and CCPA/CPRA.",
};

// Keep this in sync with the date the policy text last changed.
const LAST_UPDATED = "June 5, 2026";

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

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ color: "var(--fg-dim)", marginBottom: "8px" }}>Last updated: {LAST_UPDATED}</p>
        <p style={{ color: "var(--fg-dim)", lineHeight: 1.65, marginBottom: "36px" }}>
          This Privacy Policy explains how {LEGAL_OPERATOR_NAME} (&ldquo;FitSplit&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) collects, uses, shares, and protects your personal data when you use the
          FitSplit gym-management platform, and the rights you have over that data &mdash; including
          under the EU/UK General Data Protection Regulation (GDPR) and the California Consumer
          Privacy Act as amended by the CPRA (&ldquo;CCPA&rdquo;).
        </p>

        <Section id="controller" title="1. Who is responsible for your data">
          <p style={{ marginBottom: "12px" }}>
            {LEGAL_OPERATOR_NAME} provides the platform. Each gym that uses FitSplit decides what member data to
            collect and why, and is the <strong>controller</strong> of its members&rsquo; data;
            {LEGAL_OPERATOR_NAME} acts as a <strong>processor</strong> on that gym&rsquo;s behalf. For data we
            collect for our own purposes (e.g. account security, platform analytics), {LEGAL_OPERATOR_NAME} is the
            controller.
          </p>
          <p>
            Questions, or to exercise your rights, contact us at{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={linkStyle}>
              {LEGAL_CONTACT_EMAIL}
            </a>
            . <em>Operator: {LEGAL_OPERATOR_LINE}.</em>
          </p>
        </Section>

        <Section id="data" title="2. Data we collect">
          <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
            <li>
              <strong>Account &amp; identity:</strong> name, username, mobile number, email, role, gym
              association, and an authentication secret (a hashed password or PIN &mdash; we never store
              it in plaintext).
            </li>
            <li>
              <strong>Health &amp; fitness data:</strong> workouts, lift logs, body metrics (weight,
              body-fat), muscle/volume data, macros/nutrition, activity logs, injury notes, and coach
              notes. Some of this is <strong>health-related data</strong>, treated as a special
              category under GDPR Article 9 (see &ldquo;Legal bases&rdquo;).
            </li>
            <li>
              <strong>Attendance &amp; location:</strong> gym check-in/out records and, where you enable
              it, approximate geolocation used solely to verify you are at the gym (geofencing).
            </li>
            <li>
              <strong>Membership &amp; billing:</strong> packages, membership periods, and payment
              requests. FitSplit records membership status; it does not process card payments itself.
            </li>
            <li>
              <strong>Device &amp; usage:</strong> a session cookie, push-notification token (if you opt
              in), and limited diagnostic/error data to keep the service secure and working.
            </li>
          </ul>
        </Section>

        <Section id="use" title="3. How we use your data and our legal bases">
          <p style={{ marginBottom: "12px" }}>We use personal data to:</p>
          <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px", marginBottom: "16px" }}>
            <li>provide the workout, training, progress, and membership features you request &mdash; <em>legal basis: performance of a contract</em>;</li>
            <li>process and store health &amp; fitness data, including injury notes &mdash; <em>legal basis: your explicit consent</em> (GDPR Art. 9(2)(a)), which you may withdraw at any time;</li>
            <li>secure accounts, prevent abuse, and operate the platform &mdash; <em>legal basis: our legitimate interests</em>;</li>
            <li>send service and (if you opt in) push notifications &mdash; <em>legal basis: consent / legitimate interests</em>;</li>
            <li>comply with legal obligations and resolve disputes &mdash; <em>legal basis: legal obligation</em>.</li>
          </ul>
          <p>We do not use your data for automated decisions producing legal effects, and we do not sell your personal information.</p>
        </Section>

        <Section id="cookies" title="4. Cookies and similar technologies">
          <p>
            We use a small number of strictly-necessary cookies to keep you signed in and route you to
            the correct workspace (e.g. <code>fitsplit-session</code> and role-routing cookies). These
            are essential to the service and are not used for advertising. If you opt in to push
            notifications, a device token is stored to deliver them.
          </p>
        </Section>

        <Section id="sharing" title="5. Who we share data with">
          <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
            <li>
              <strong>Your gym&rsquo;s staff:</strong> owners and trainers at the gym you belong to can
              see the data needed to coach you (programs, logs, progress, attendance, membership).
            </li>
            <li>
              <strong>Infrastructure sub-processor:</strong> Google Firebase (Cloud Firestore,
              Authentication, Storage, Cloud Functions, Cloud Messaging, App Hosting) stores and
              processes data on our behalf under Google&rsquo;s data-processing terms.
            </li>
            <li>
              <strong>Error monitoring:</strong> diagnostic data may be sent to our error-monitoring
              provider to keep the service reliable.
            </li>
            <li>
              <strong>Legal:</strong> we may disclose data where required by law or to protect rights
              and safety.
            </li>
          </ul>
          <p style={{ marginTop: "12px" }}>
            <strong>We do not sell or &ldquo;share&rdquo; your personal information</strong> as those
            terms are defined under the CCPA/CPRA.
          </p>
        </Section>

        <Section id="transfers" title="6. International transfers">
          <p>
            FitSplit is operated from India and uses Google Cloud regions (primary region{" "}
            <code>asia-south1</code>). Where data is transferred across borders, our providers rely on
            recognised safeguards such as the EU Standard Contractual Clauses. We take steps to ensure
            your data remains protected wherever it is processed.
          </p>
        </Section>

        <Section id="retention" title="7. How long we keep data">
          <p>
            We keep personal data for as long as your account is active and as needed to provide the
            service. Deleted records are moved to a soft-delete archive and permanently purged after{" "}
            <strong>60 days</strong>, unless a longer period is required by law. You can ask us to
            delete your data sooner (see your rights below).
          </p>
        </Section>

        <Section id="security" title="8. How we protect data">
          <p>
            We apply industry-standard safeguards: encrypted transport (HTTPS/HSTS), a strict Content
            Security Policy and security headers, role-based access controls enforced by Firestore and
            Storage security rules, multi-tenant isolation between gyms, hashed credentials, and login
            rate-limiting/lockout. No system is perfectly secure, but we work to protect your data and
            to respond promptly to any incident.
          </p>
        </Section>

        <Section id="rights-gdpr" title="9. Your GDPR rights (EU/UK)">
          <p style={{ marginBottom: "12px" }}>If the GDPR applies to you, you have the right to:</p>
          <ul style={{ paddingLeft: "20px", display: "grid", gap: "6px" }}>
            <li>access a copy of your data, and rectify inaccurate data;</li>
            <li>erase your data (&ldquo;right to be forgotten&rdquo;) and restrict processing;</li>
            <li>data portability &mdash; receive your data in a machine-readable format;</li>
            <li>object to processing based on legitimate interests;</li>
            <li>withdraw consent at any time (this does not affect prior processing);</li>
            <li>lodge a complaint with your local data-protection supervisory authority.</li>
          </ul>
        </Section>

        <Section id="rights-ccpa" title="10. Your CCPA/CPRA rights (California)">
          <p style={{ marginBottom: "12px" }}>If you are a California resident, you have the right to:</p>
          <ul style={{ paddingLeft: "20px", display: "grid", gap: "6px" }}>
            <li>know what personal information we collect and how it is used and disclosed;</li>
            <li>delete personal information we hold about you;</li>
            <li>correct inaccurate personal information;</li>
            <li>opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information &mdash; note we do <strong>not</strong> sell or share it;</li>
            <li>not be discriminated against for exercising your rights.</li>
          </ul>
          <p style={{ marginTop: "12px" }}>
            You may use an authorised agent to make a request on your behalf; we will verify the
            request before acting on it.
          </p>
        </Section>

        <Section id="exercise" title="11. How to exercise your rights">
          <p>
            Email{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={linkStyle}>
              {LEGAL_CONTACT_EMAIL}
            </a>{" "}
            with your request. Members can also ask their gym&rsquo;s owner to action many requests
            directly. We will respond within the timeframe required by applicable law (generally 30
            days under the GDPR; 45 days under the CCPA), and may need to verify your identity first.
          </p>
        </Section>

        <Section id="children" title="12. Children">
          <p>
            FitSplit is not directed to children. We do not knowingly collect data from anyone under 16
            (or the minimum age in your jurisdiction) without verifiable parental/guardian consent. If
            you believe a child has provided us data, contact us and we will delete it.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to this policy">
          <p>
            We may update this policy from time to time. We will revise the &ldquo;Last updated&rdquo;
            date above and, for material changes, provide a more prominent notice. Continued use of
            FitSplit after an update means you accept the revised policy.
          </p>
        </Section>

        <Section id="contact" title="14. Contact us">
          <p>
            For any privacy question or request, write to{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} style={linkStyle}>
              {LEGAL_CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link href="/terms" style={linkStyle}>
              Terms of Service
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
