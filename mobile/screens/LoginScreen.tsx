import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { signIn, type LoginMode } from "@/lib/auth";
import { theme } from "@/lib/theme";

export default function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>("member");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setStatus("loading");
    setError("");
    const result = await signIn(identifier, password, mode);
    if (result.status === "error") {
      setStatus("error");
      setError(result.message);
      return;
    }
    // onAuthStateChanged in App.tsx picks up the signed-in user from here.
    setStatus("idle");
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.wordmark}>
          Fit<Text style={styles.wordmarkAccent}>Split</Text>
        </Text>
        <Text style={styles.tagline}>Train with your gym, anywhere.</Text>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, mode === "member" && styles.modeButtonActive]}
              onPress={() => setMode("member")}
            >
              <Text style={mode === "member" ? styles.modeTextActive : styles.modeText}>Member</Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === "staff" && styles.modeButtonActive]}
              onPress={() => setMode("staff")}
            >
              <Text style={mode === "staff" ? styles.modeTextActive : styles.modeText}>Staff</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{mode === "member" ? "Username or mobile number" : "Username"}</Text>
          <TextInput
            style={styles.input}
            placeholder={mode === "member" ? "e.g. 98765 43210" : "your.username"}
            placeholderTextColor={theme.textSoft}
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
            editable={status !== "loading"}
          />

          <Text style={styles.label}>{mode === "member" ? "4-digit PIN" : "Password"}</Text>
          <TextInput
            style={styles.input}
            placeholder={mode === "member" ? "••••" : "Your password"}
            placeholderTextColor={theme.textSoft}
            secureTextEntry
            keyboardType={mode === "member" ? "number-pad" : "default"}
            maxLength={mode === "member" ? 4 : undefined}
            value={password}
            onChangeText={setPassword}
            editable={status !== "loading"}
          />

          {status === "error" ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              status === "loading" && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={styles.submitText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footnote}>Forgot your PIN? Ask your gym owner for a reset.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  wordmark: { fontSize: 34, fontWeight: "800", color: theme.text, textAlign: "center", letterSpacing: -0.5 },
  wordmarkAccent: { color: theme.brand },
  tagline: { fontSize: 15, color: theme.textSoft, textAlign: "center", marginTop: 6, marginBottom: 28 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 10
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: theme.accentSoft,
    borderRadius: theme.radiusSm,
    padding: 4,
    marginBottom: 8
  },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: "center", minHeight: 44, justifyContent: "center" },
  modeButtonActive: { backgroundColor: theme.brand },
  modeText: { color: theme.textSoft, fontSize: 15, fontWeight: "600" },
  modeTextActive: { color: theme.primaryForeground, fontSize: 15, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: theme.textSoft, marginTop: 6 },
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
  errorBox: {
    backgroundColor: theme.dangerSoft,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4
  },
  errorText: { color: theme.danger, fontSize: 14 },
  submitButton: {
    backgroundColor: theme.brand,
    borderRadius: theme.radiusSm,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50
  },
  submitButtonPressed: { backgroundColor: theme.brandStrong },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: theme.primaryForeground, fontSize: 16, fontWeight: "700" },
  footnote: { fontSize: 13, color: theme.textSoft, textAlign: "center", marginTop: 20 }
});
