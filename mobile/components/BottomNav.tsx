import React from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { theme } from "@/lib/theme";

export type ScreenType = "overview" | "workout" | "logs" | "progress" | "macros";

interface BottomNavProps {
  currentScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
}

const NAV_ITEMS: { value: ScreenType; label: string; icon: string }[] = [
  { value: "overview", label: "Overview", icon: "🏠" },
  { value: "workout", label: "Workout", icon: "🏋️" },
  { value: "logs", label: "Logs", icon: "📋" },
  { value: "progress", label: "Progress", icon: "📈" },
  { value: "macros", label: "Macros", icon: "🔥" }
];

export default function BottomNav({ currentScreen, onScreenChange }: BottomNavProps) {
  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = currentScreen === item.value;
        return (
          <Pressable
            key={item.value}
            style={styles.navItem}
            onPress={() => onScreenChange(item.value)}
          >
            <Text style={[styles.icon, isActive && styles.activeIcon]}>
              {item.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingBottom: 24,
    paddingTop: 10,
    justifyContent: "space-around",
    alignItems: "center"
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 4
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
    opacity: 0.6
  },
  activeIcon: {
    opacity: 1,
    transform: [{ scale: 1.15 }]
  },
  label: {
    fontSize: 11,
    color: theme.textSoft,
    fontWeight: "500"
  },
  activeLabel: {
    color: theme.brand,
    fontWeight: "700"
  }
});
