import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCurrentProfile, type AuthenticatedProfile } from "@/lib/auth";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { theme } from "@/lib/theme";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import BottomNav, { type ScreenType } from "@/components/BottomNav";
import OverviewScreen from "@/screens/OverviewScreen";
import WorkoutScreen from "@/screens/WorkoutScreen";
import LogsScreen from "@/screens/LogsScreen";
import ProgressScreen from "@/screens/ProgressScreen";
import MacrosScreen from "@/screens/MacrosScreen";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthenticatedProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("overview");
  const [authView, setAuthView] = useState<"login" | "signup">("login");

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        setLoadingProfile(true);
        try {
          const prof = await getCurrentProfile();
          setProfile(prof);
          // Non-blocking: push registration must never delay getting into the app.
          void registerForPushNotificationsAsync();
        } catch (err) {
          console.error("Failed to load profile:", err);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setProfile(null);
      }
      setCheckingSession(false);
    });
  }, []);

  if (checkingSession || loadingProfile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.brand} />
        <StatusBar style="light" />
      </View>
    );
  }

  const renderScreen = () => {
    if (!profile) return null;
    switch (currentScreen) {
      case "overview":
        return <OverviewScreen profile={profile} />;
      case "workout":
        return <WorkoutScreen profile={profile} />;
      case "logs":
        return <LogsScreen profile={profile} />;
      case "progress":
        return <ProgressScreen profile={profile} />;
      case "macros":
        return <MacrosScreen profile={profile} />;
      default:
        return <OverviewScreen profile={profile} />;
    }
  };

  return (
    <View style={styles.root}>
      <ErrorBoundary>
        {user && profile ? (
          <View style={styles.main}>
            <View style={styles.content}>{renderScreen()}</View>
            <BottomNav currentScreen={currentScreen} onScreenChange={setCurrentScreen} />
          </View>
        ) : authView === "signup" ? (
          <SignupScreen onGoToLogin={() => setAuthView("login")} />
        ) : (
          <LoginScreen onGoToSignup={() => setAuthView("signup")} />
        )}
      </ErrorBoundary>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  main: { flex: 1 },
  content: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }
});
