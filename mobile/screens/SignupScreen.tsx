import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  requestPhoneOtpCallable,
  verifyPhoneOtpCallable,
  signInWithCustomOtpToken
} from "@/lib/auth";
import { theme } from "@/lib/theme";

interface SignupScreenProps {
  onGoToLogin: () => void;
}

export default function SignupScreen({ onGoToLogin }: SignupScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [cooldown, setCooldown] = useState(0);

  function startCooldown() {
    setCooldown(30);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const res = await requestPhoneOtpCallable({ phone });
      if (res.data.data?.debugOtp) {
        setOtpCode(res.data.data.debugOtp);
      }
      setStep(2);
      setStatus("idle");
      startCooldown();
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Failed to send verification code.");
    }
  }

  async function handleVerifyOtp() {
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Please enter a 6-digit code.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const res = await verifyPhoneOtpCallable({ phone, code: otpCode });
      setCustomToken(res.data.data.customToken);
      setStep(3);
      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Incorrect verification code.");
    }
  }

  async function handleCompleteSignup() {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter your name (at least 2 characters).");
      setStatus("error");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the terms to continue.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const res = await signInWithCustomOtpToken(customToken, fullName.trim(), phone);
      if (res.status === "error") {
        setStatus("error");
        setError(res.message);
      } else {
        // Logged in! onAuthStateChanged in App.tsx takes over.
        setStatus("idle");
      }
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Could not complete registration.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>
          Fit<Text style={styles.wordmarkAccent}>Split</Text>
        </Text>
        <Text style={styles.tagline}>
          {step === 1 && "Create your personal training workspace"}
          {step === 2 && "Enter your 6-digit code"}
          {step === 3 && "Tell us your name"}
        </Text>

        <View style={styles.card}>
          {/* Step Indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
              <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
            </View>
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
              <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
            </View>
            <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
              <Text style={[styles.stepNum, step >= 3 && styles.stepNumActive]}>3</Text>
            </View>
          </View>

          {/* Error display */}
          {status === "error" ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Step 1: Mobile number */}
          {step === 1 && (
            <>
              <Text style={styles.label}>Mobile number</Text>
              <View style={styles.phoneInputWrap}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={theme.textSoft}
                  keyboardType="phone-pad"
                  autoFocus
                  value={phone}
                  onChangeText={setPhone}
                  editable={status !== "loading"}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  status === "loading" && styles.submitButtonDisabled
                ]}
                onPress={handleSendOtp}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text style={styles.submitText}>Send verification code →</Text>
                )}
              </Pressable>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="123456"
                placeholderTextColor={theme.textSoft}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChangeText={setOtpCode}
                editable={status !== "loading"}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  status === "loading" && styles.submitButtonDisabled
                ]}
                onPress={handleVerifyOtp}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text style={styles.submitText}>Verify code →</Text>
                )}
              </Pressable>

              <View style={styles.subActions}>
                {cooldown > 0 ? (
                  <Text style={styles.resendTimer}>Resend in {cooldown}s</Text>
                ) : (
                  <Pressable onPress={handleSendOtp}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => { setStep(1); setError(""); }}>
                  <Text style={styles.changePhoneLink}>Change number</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Step 3: Name & Terms */}
          {step === 3 && (
            <>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Alex Kumar"
                placeholderTextColor={theme.textSoft}
                autoCapitalize="words"
                autoFocus
                value={fullName}
                onChangeText={setFullName}
                editable={status !== "loading"}
              />

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setTermsAccepted((v) => !v)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>
                  I accept the Terms of Service, Privacy Policy, and Health Disclaimer.
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  status === "loading" && styles.submitButtonDisabled
                ]}
                onPress={handleCompleteSignup}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text style={styles.submitText}>Start Training Free 🚀</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        <Pressable style={styles.switchMode} onPress={onGoToLogin}>
          <Text style={styles.switchModeText}>
            Already have an account? <Text style={styles.switchModeAccent}>Sign in with PIN</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  inner: { flexGrow: 1, justifyContent: "center", padding: 24 },
  wordmark: { fontSize: 34, fontWeight: "800", color: theme.text, textAlign: "center", letterSpacing: -0.5 },
  wordmarkAccent: { color: theme.brand },
  tagline: { fontSize: 15, color: theme.textSoft, textAlign: "center", marginTop: 6, marginBottom: 24 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 12
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 8
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  stepDotActive: {
    backgroundColor: theme.brand
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSoft
  },
  stepNumActive: {
    color: theme.primaryForeground
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  stepLineActive: {
    backgroundColor: theme.brand
  },
  label: { fontSize: 13, fontWeight: "600", color: theme.textSoft, marginTop: 4 },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    minHeight: 48,
    paddingHorizontal: 12
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textSoft,
    marginRight: 8
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: theme.text
  },
  otpInput: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    fontSize: 24,
    fontWeight: "800",
    color: theme.brand,
    textAlign: "center",
    letterSpacing: 8,
    minHeight: 52,
    paddingHorizontal: 12
  },
  input: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    minHeight: 48
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
    marginBottom: 4
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: theme.brand,
    borderColor: theme.brand
  },
  checkmark: {
    color: theme.primaryForeground,
    fontSize: 12,
    fontWeight: "800"
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: theme.textSoft,
    lineHeight: 18
  },
  errorBox: {
    backgroundColor: theme.dangerSoft,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  errorText: { color: theme.danger, fontSize: 13 },
  submitButton: {
    backgroundColor: theme.brand,
    borderRadius: theme.radiusSm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50
  },
  submitButtonPressed: { backgroundColor: theme.brandStrong },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: theme.primaryForeground, fontSize: 16, fontWeight: "700" },
  subActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  resendTimer: { fontSize: 13, color: theme.textSoft },
  resendLink: { fontSize: 13, color: theme.brand, fontWeight: "600" },
  changePhoneLink: { fontSize: 13, color: theme.textSoft },
  switchMode: { marginTop: 24, alignItems: "center" },
  switchModeText: { fontSize: 14, color: theme.textSoft },
  switchModeAccent: { color: theme.brand, fontWeight: "700" }
});
