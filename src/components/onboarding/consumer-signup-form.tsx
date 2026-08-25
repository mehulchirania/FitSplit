"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestSignupOtp, signUpConsumer } from "@/lib/firebase/actions/consumer-signup";

export function ConsumerSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  function startCooldownTimer() {
    setCooldown(30);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setInfo(null);

    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    startTransition(async () => {
      const res = await requestSignupOtp(phone);
      if (res.status === "error") {
        setError(res.message);
      } else {
        setInfo(res.message);
        if (res.debugOtp) {
          setOtpCode(res.debugOtp);
        }
        setStep(2);
        startCooldownTimer();
      }
    });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Please enter a valid 6-digit code.");
      return;
    }
    setStep(3);
  }

  async function handleCompleteSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the terms and disclaimer to proceed.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("phone", phone);
      formData.set("otpCode", otpCode);
      formData.set("termsAccepted", "true");

      const res = await signUpConsumer(formData);
      if (res.status === "error") {
        setError(res.message);
      } else {
        router.push("/member");
        router.refresh();
      }
    });
  }

  return (
    <div style={styles.card}>
      {/* Progress Dots */}
      <div style={styles.stepsRow}>
        <div style={{ ...styles.stepDot, ...(step >= 1 ? styles.stepDotActive : {}) }}>
          <span style={styles.stepNum}>1</span>
        </div>
        <div style={{ ...styles.stepLine, ...(step >= 2 ? styles.stepLineActive : {}) }} />
        <div style={{ ...styles.stepDot, ...(step >= 2 ? styles.stepDotActive : {}) }}>
          <span style={styles.stepNum}>2</span>
        </div>
        <div style={{ ...styles.stepLine, ...(step >= 3 ? styles.stepLineActive : {}) }} />
        <div style={{ ...styles.stepDot, ...(step >= 3 ? styles.stepDotActive : {}) }}>
          <span style={styles.stepNum}>3</span>
        </div>
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>
          {step === 1 && "Create your free account"}
          {step === 2 && "Enter verification code"}
          {step === 3 && "Tell us your name"}
        </h1>
        <p style={styles.subtitle}>
          {step === 1 && "Train for free, log lifts offline, and track progressive overload."}
          {step === 2 && `We sent a 6-digit code to +91 ${phone.replace(/\D/g, "").slice(-10)}`}
          {step === 3 && "This will be displayed on your personal workout logs and profile."}
        </p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {info && <div style={styles.infoBanner}>{info}</div>}

      {/* Step 1: Phone */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} style={styles.form}>
          <label style={styles.label}>
            Mobile number
            <div style={styles.phoneInputWrap}>
              <span style={styles.countryCode}>🇮🇳 +91</span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.phoneInput}
                autoFocus
                disabled={isPending}
                required
              />
            </div>
          </label>

          <button
            type="submit"
            style={{ ...styles.submitBtn, ...(isPending ? styles.submitBtnDisabled : {}) }}
            disabled={isPending}
          >
            {isPending ? "Sending OTP..." : "Continue with OTP →"}
          </button>
        </form>
      )}

      {/* Step 2: OTP Code */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} style={styles.form}>
          <label style={styles.label}>
            6-digit verification code
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              style={styles.otpInput}
              autoFocus
              required
            />
          </label>

          <button type="submit" style={styles.submitBtn}>
            Verify code →
          </button>

          <div style={styles.resendRow}>
            {cooldown > 0 ? (
              <span style={styles.resendText}>Resend code in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                style={styles.resendBtn}
                disabled={isPending}
              >
                Resend OTP
              </button>
            )}
            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              style={styles.changePhoneBtn}
            >
              Change number
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Full Name + Consent */}
      {step === 3 && (
        <form onSubmit={handleCompleteSignup} style={styles.form}>
          <label style={styles.label}>
            Full name
            <input
              type="text"
              placeholder="e.g. Alex Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={styles.input}
              autoFocus
              disabled={isPending}
              required
            />
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={styles.checkbox}
              required
            />
            <span style={styles.checkboxText}>
              I agree to the{" "}
              <Link href="/terms" style={styles.link} target="_blank">
                Terms of Service
              </Link>
              ,{" "}
              <Link href="/privacy" style={styles.link} target="_blank">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/disclaimer" style={styles.link} target="_blank">
                Health &amp; Fitness Disclaimer
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            style={{ ...styles.submitBtn, ...(isPending ? styles.submitBtnDisabled : {}) }}
            disabled={isPending}
          >
            {isPending ? "Setting up workspace..." : "Launch FitSplit Workspace 🚀"}
          </button>
        </form>
      )}

      <div style={styles.footer}>
        Already have a gym account?{" "}
        <Link href="/" style={styles.loginLink}>
          Sign in with PIN
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
  stepsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
    gap: "8px"
  },
  stepDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "var(--text-muted, #888)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    transition: "all 0.2s ease"
  },
  stepDotActive: {
    backgroundColor: "#C8F135",
    color: "#0A0A0A"
  },
  stepNum: {
    lineHeight: "1"
  },
  stepLine: {
    width: "36px",
    height: "2px",
    backgroundColor: "rgba(255,255,255,0.08)",
    transition: "all 0.2s ease"
  },
  stepLineActive: {
    backgroundColor: "#C8F135"
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
  infoBanner: {
    backgroundColor: "rgba(200, 241, 53, 0.12)",
    border: "1px solid rgba(200, 241, 53, 0.3)",
    color: "#D9F99D",
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
  phoneInputWrap: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "var(--bg-input, #0A0A0A)",
    border: "1px solid var(--border-soft, rgba(255,255,255,0.12))",
    borderRadius: "10px",
    overflow: "hidden",
    transition: "border-color 0.15s ease"
  },
  countryCode: {
    padding: "0 12px 0 14px",
    fontSize: "14px",
    color: "var(--text-muted, #888)",
    fontWeight: "600",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    lineHeight: "46px"
  },
  phoneInput: {
    flex: 1,
    border: "none",
    backgroundColor: "transparent",
    color: "#FFF",
    padding: "12px 14px",
    fontSize: "16px",
    outline: "none"
  },
  otpInput: {
    backgroundColor: "var(--bg-input, #0A0A0A)",
    border: "1px solid var(--border-soft, rgba(255,255,255,0.12))",
    borderRadius: "10px",
    color: "#C8F135",
    padding: "12px 14px",
    fontSize: "24px",
    textAlign: "center",
    letterSpacing: "8px",
    fontWeight: "800",
    outline: "none"
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
  resendRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px"
  },
  resendText: {
    color: "var(--text-muted, #666)"
  },
  resendBtn: {
    background: "none",
    border: "none",
    color: "#C8F135",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0
  },
  changePhoneBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted, #888)",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0
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
