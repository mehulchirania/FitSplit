import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCurrentProfile, type AuthenticatedProfile } from "@/lib/auth";
import { theme } from "@/lib/theme";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoginScreen from "@/screens/LoginScreen";
import BottomNav, { type ScreenType } from "@/components/BottomNav";
import OverviewScreen from "@/screens/OverviewScreen";
import WorkoutScreen from "@/screens/WorkoutScreen";
import LogsScreen from "@/screens/LogsScreen";
import ProgressScreen from "@/screens/ProgressScreen";
import MacrosScreen from "@/screens/MacrosScreen";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<AuthenticatedProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("overview");

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        setLoadingProfile(true);
        try {
          const prof = await getCurrentProfile();
          setProfile(prof);
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
        ) : (
          <LoginScreen />
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
