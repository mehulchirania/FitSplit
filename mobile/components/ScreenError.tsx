import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/lib/theme";

interface ScreenErrorProps {
  message: string;
  onRetry: () => void;
}

/** Centered error state with a retry action — shared across all five member tabs. */
export default function ScreenError({ message, onRetry }: ScreenErrorProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg, padding: 24, gap: 16 },
  message: { color: theme.danger, fontSize: 15, textAlign: "center" },
  retryBtn: {
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingVertical: 10,
    paddingHorizontal: 24
  },
  retryBtnText: { color: theme.text, fontSize: 14, fontWeight: "700" }
});
