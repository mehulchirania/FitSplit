import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/lib/theme";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors from any descendant so a single screen failure degrades
 * to an inline message instead of unmounting the whole app to a blank screen.
 * Without this, an uncaught error anywhere in the tree = total UI loss.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary] caught render error:", error);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: theme.bg, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: theme.text },
  message: { fontSize: 15, color: theme.danger, textAlign: "center" },
  button: { marginTop: 12, backgroundColor: theme.brand, borderRadius: theme.radiusSm, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: theme.primaryForeground, fontSize: 16, fontWeight: "700" }
});
