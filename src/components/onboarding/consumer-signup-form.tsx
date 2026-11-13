"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhoneField, PinField } from "@/components/phone-pin-fields";
import { signUpWithPhone } from "@/lib/auth";
import { DIAGNOSTICS_STORAGE_KEY } from "@/lib/consent-preferences";
import { isValidPin, normalizePhone } from "@/lib/phone-identity";
import { SIGNUP_LIMITS } from "@/lib/signup-schema";

export function ConsumerSignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageGroup, setAgeGroup] = useState<"adult" | "minor" | "">("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [diagnostics, setDiagnostics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!normalizePhone(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidPin(pin)) {
      setError("Your PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("The two PINs do not match.");
      return;
    }
    if (!ageGroup) {
      setError("Tell us whether you are 18 or older.");
      return;
    }
    if (ageGroup === "minor") {
      if (!guardianConsent) {
        setError("A parent or guardian must consent for users under 18.");
        return;
      }
      if (!guardianEmail.trim()) {
        setError("Enter your parent or guardian's email address.");
        return;
      }
    }
    if (!termsAccepted) {
      setError("You must agree to the Terms and the Privacy Notice to create an account.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("phone", phone.trim());
      formData.set("pin", pin);
      formData.set("confirmPin", confirmPin);
      formData.set("termsAccepted", "true");
      formData.set("ageGroup", ageGroup);
      if (ageGroup === "minor") {
        formData.set("guardianConsent", "true");
        formData.set("guardianEmail", guardianEmail);
      } else if (diagnostics) {
        formData.set("diagnosticsConsent", "true");
      }

      const res = await signUpWithPhone(formData);
      if (res.status === "error") {
        setError(res.message);
        setPin("");
        setConfirmPin("");
        return;
      }
      try {
        window.localStorage.setItem(DIAGNOSTICS_STORAGE_KEY, ageGroup !== "minor" && diagnostics ? "1" : "0");
      } catch {
        /* storage unavailable: diagnostics simply stay off */
      }
      window.localStorage.setItem("fitsplit-session-start", String(Date.now()));
      window.localStorage.setItem("fitsplit-remember-me", "true");
      router.push(res.redirectUrl);
      router.refresh();
    });
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Workout plans, an exercise library and a simple log for every set.</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Your name
          <input
            autoComplete="name"
            onChange={(e) => setFullName(e.target.value)}
            maxLength={SIGNUP_LIMITS.name}
            required
            style={styles.input}
            type="text"
            value={fullName}
          />
        </label>
        <div style={styles.label}>
          <label htmlFor="signup-phone">Mobile number</label>
          <PhoneField id="signup-phone" value={phone} onChange={setPhone} disabled={isPending} />
          <span style={styles.hint}>You will sign in with this number. We never text or call it.</span>
        </div>
        <div style={styles.label}>
          <span>Choose a 4-digit PIN</span>
          <PinField label="PIN" value={pin} onChange={setPin} disabled={isPending} />
        </div>
        <div style={styles.label}>
          <span>Confirm PIN</span>
          <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} disabled={isPending} />
          <span style={styles.hint}>Pick one you will remember.</span>
        </div>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Your age</legend>
          <label style={styles.checkboxLabel}>
            <input
              checked={ageGroup === "adult"}
              name="ageGroup"
              onChange={() => setAgeGroup("adult")}
              style={styles.checkbox}
              type="radio"
              value="adult"
            />
            <span style={styles.checkboxText}>I am 18 or older</span>
          </label>
          <label style={styles.checkboxLabel}>
            <input
              checked={ageGroup === "minor"}
              name="ageGroup"
              onChange={() => setAgeGroup("minor")}
              style={styles.checkbox}
              type="radio"
              value="minor"
            />
            <span style={styles.checkboxText}>I am under 18</span>
          </label>
        </fieldset>

        {ageGroup === "minor" && (
          <div style={styles.guardianBox}>
            <p style={styles.guardianNote}>
              Because you are under 18, a parent or legal guardian must agree to FitSplit processing your data. We
              do not track or profile under-18 users. See the{" "}
              <Link href="/privacy#children-under-18" style={styles.link} target="_blank">
                Privacy Notice
              </Link>
              .
            </p>
            <label style={styles.label}>
              Parent or guardian email
              <input
                autoComplete="off"
                maxLength={SIGNUP_LIMITS.email}
                onChange={(e) => setGuardianEmail(e.target.value)}
                required
                style={styles.input}
                type="email"
                value={guardianEmail}
              />
            </label>
            <label style={styles.checkboxLabel}>
              <input
                checked={guardianConsent}
                onChange={(e) => setGuardianConsent(e.target.checked)}
                style={styles.checkbox}
                type="checkbox"
              />
              <span style={styles.checkboxText}>
                I am this person&apos;s parent or legal guardian, and I consent to FitSplit processing their
                personal data as described in the Privacy Notice.
              </span>
            </label>
          </div>
        )}

        <p style={styles.noticeSummary}>
          FitSplit uses your name, mobile number and the workout, body-weight and nutrition data you enter to run your
          account. Details, your rights and how to reach our Grievance Officer are in the{" "}
          <Link href="/privacy" style={styles.link} target="_blank">
            Privacy Notice
          </Link>
          .
        </p>

        <label style={styles.checkboxLabel}>
          <input
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={styles.checkbox}
            type="checkbox"
          />
          <span style={styles.checkboxText}>
            I agree to the{" "}
            <Link href="/terms" style={styles.link} target="_blank">
              Terms of Service
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" style={styles.link} target="_blank">
              Privacy Notice
            </Link>
            , and I consent to the processing of my personal data as described in them. I have read the{" "}
            <Link href="/health-disclaimer" style={styles.link} target="_blank">
              Health Disclaimer
            </Link>
            .
          </span>
        </label>

        {ageGroup !== "minor" && (
          <label style={styles.checkboxLabel}>
            <input
              checked={diagnostics}
              onChange={(e) => setDiagnostics(e.target.checked)}
              style={styles.checkbox}
              type="checkbox"
            />
            <span style={styles.checkboxText}>
              Optional: help us fix bugs by letting FitSplit collect error diagnostics from this device (and
              occasional masked session replays). You can leave this unticked and still use everything, and
              change your mind any time on the{" "}
              <Link href="/data-rights" style={styles.link} target="_blank">
                Data Rights page
              </Link>
              .
            </span>
          </label>
        )}

        <button
          disabled={isPending}
          style={{ ...styles.submitBtn, ...(isPending ? styles.submitBtnDisabled : {}) }}
          type="submit"
        >
          {isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div style={styles.footer}>
        Already have an account?{" "}
        <Link href="/" style={styles.loginLink}>
          Log in
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "var(--bg-card, #141416)",
    border: "1px solid var(--border-soft, rgba(255,255,255,0.08))",
    borderRadius: "16px",
    padding: "32px 28px",
    maxWidth: "460px",
    width: "100%",
    boxShadow: "0 24px 64px -12px rgba(0,0,0,0.6)"
  },
  header: {
    textAlign: "center",
    marginBottom: "24px"
  },
  title: {
    fontSize: "22px",
    fontWeight: "800",
    color: "var(--text-primary, #FFFFFF)",
    margin: "0 0 8px 0",
    letterSpacing: "-0.02em"
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--text-secondary, #999)",
    margin: 0,
    lineHeight: "1.4"
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#FCA5A5",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "18px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-secondary, #BBB)",
    gap: "8px"
  },
  hint: {
    fontSize: "12px",
    fontWeight: "400",
    color: "var(--text-faint, #808080)",
    lineHeight: "1.4"
  },
  input: {
    backgroundColor: "var(--bg-input, #0A0A0A)",
    border: "1px solid var(--border-soft, rgba(255,255,255,0.12))",
    borderRadius: "10px",
    color: "#FFF",
    padding: "12px 14px",
    fontSize: "15px",
    outline: "none"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--text-muted, #888)",
    lineHeight: "1.4"
  },
  checkbox: {
    marginTop: "2px",
    accentColor: "#C8F135"
  },
  fieldset: {
    border: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  legend: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-secondary, #BBB)",
    padding: 0,
    marginBottom: "10px"
  },
  guardianBox: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid var(--border-soft, rgba(255,255,255,0.12))"
  },
  guardianNote: {
    margin: 0,
    fontSize: "12px",
    lineHeight: "1.5",
    color: "var(--text-muted, #888)"
  },
  noticeSummary: {
    margin: 0,
    fontSize: "12px",
    lineHeight: "1.5",
    color: "var(--text-muted, #888)"
  },
  checkboxText: {
    flex: 1
  },
  link: {
    color: "#C8F135",
    textDecoration: "underline"
  },
  submitBtn: {
    backgroundColor: "#C8F135",
    color: "#0A0A0A",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "transform 0.1s ease, opacity 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed"
  },
  footer: {
    marginTop: "24px",
    paddingTop: "18px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    textAlign: "center",
    fontSize: "13px",
    color: "var(--text-muted, #777)"
  },
  loginLink: {
    color: "#C8F135",
    fontWeight: "600",
    textDecoration: "none",
    marginLeft: "4px"
  }
};
