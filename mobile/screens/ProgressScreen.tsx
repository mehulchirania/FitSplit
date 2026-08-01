import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/lib/theme";
import ScreenError from "@/components/ScreenError";
import type { AuthenticatedProfile } from "@/lib/auth";
import { getLiftLogs } from "@/lib/data";
import { getTodayFocus } from "@/lib/programs";
import { logBodyWeight } from "@/lib/mutations";
import type { Exercise } from "@fitsplit/core";

interface ProgressScreenProps {
  profile: AuthenticatedProfile;
}

type PRItem = {
  exerciseId: string;
  name: string;
  maxWeight: number;
  reps: string;
  date: string;
};

export default function ProgressScreen({ profile }: ProgressScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    benchE1RM: 0,
    weeklyVolume: 0,
    weeklySets: 0,
    monthlyPRsCount: 0
  });
  const [prList, setPrList] = useState<PRItem[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [weightStatus, setWeightStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [weightMsg, setWeightMsg] = useState("");

  async function handleLogWeight() {
    const weightKg = Number(weightInput);
    if (!Number.isFinite(weightKg) || weightKg < 10 || weightKg > 500) {
      setWeightStatus("error");
      setWeightMsg("Enter a weight between 10 and 500 kg.");
      return;
    }
    setWeightStatus("saving");
    setWeightMsg("");
    try {
      await logBodyWeight({ memberId: profile.uid, weightKg });
      setWeightStatus("saved");
      setWeightMsg(`Logged ${weightKg} kg.`);
      setWeightInput("");
    } catch (err) {
      setWeightStatus("error");
      setWeightMsg(err instanceof Error ? err.message : "Could not log weight.");
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const gymId = profile.defaultGymId;
      const memberId = profile.uid;

      const [liftLogs, focus] = await Promise.all([
          getLiftLogs(gymId, memberId, 500),
          getTodayFocus(gymId, memberId).catch(() => null)
        ]);

        const exerciseMap = focus?.exercisesById || new Map<string, Exercise>();

        // Calculate Weekly stats (Mon-Sun)
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        startOfWeek.setHours(0, 0, 0, 0);

        let weeklyVolume = 0;
        let weeklySets = 0;

        for (const log of liftLogs) {
          if (log.loggedAt && new Date(log.loggedAt) >= startOfWeek) {
            weeklySets += 1;
            const repsNum = Number(log.reps) || 0;
            weeklyVolume += log.weight * repsNum;
          }
        }

        // Calculate Personal Records (Max weight per exercise)
        const prsMap = new Map<string, { weight: number; reps: string; date: string }>();
        for (const log of liftLogs) {
          if (!log.exerciseId) continue;
          const current = prsMap.get(log.exerciseId);
          if (!current || log.weight > current.weight) {
            prsMap.set(log.exerciseId, {
              weight: log.weight,
              reps: log.reps,
              date: log.loggedAt ? log.loggedAt.slice(0, 10) : ""
            });
          }
        }

        // Convert PRs to list
        const prsList: PRItem[] = [];
        prsMap.forEach((val, exId) => {
          const exName = exerciseMap.get(exId)?.name ?? "Exercise";
          prsList.push({
            exerciseId: exId,
            name: exName,
            maxWeight: val.weight,
            reps: val.reps,
            date: val.date
          });
        });
        prsList.sort((a, b) => a.name.localeCompare(b.name));

        // Find Bench Press e1RM
        // Bench Press exercise IDs typically contain "bench"
        let benchE1RM = 0;
        for (const log of liftLogs) {
          const exName = exerciseMap.get(log.exerciseId)?.name.toLowerCase() ?? "";
          if (exName.includes("bench press")) {
            const repsNum = Number(log.reps) || 0;
            const e1rm = log.weight * (1 + repsNum / 30);
            if (e1rm > benchE1RM) {
              benchE1RM = Math.round(e1rm);
            }
          }
        }

        // Monthly PR count (PRs set in the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let monthlyPRsCount = 0;
        prsMap.forEach((val) => {
          if (val.date && new Date(val.date) >= thirtyDaysAgo) {
            monthlyPRsCount += 1;
          }
        });

      setStats({
        benchE1RM,
        weeklyVolume,
        weeklySets,
        monthlyPRsCount
      });
      setPrList(prsList);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not load your progress.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [profile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  if (error) {
    return <ScreenError message={error} onRetry={load} />;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Progress Analytics</Text>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Bodyweight logger */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log today's bodyweight</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="Weight (kg)"
              placeholderTextColor={theme.textSoft}
              keyboardType="numeric"
              value={weightInput}
              onChangeText={setWeightInput}
              editable={weightStatus !== "saving"}
            />
            <Pressable
              style={({ pressed }) => [styles.weightButton, pressed && styles.weightButtonPressed]}
              onPress={handleLogWeight}
              disabled={weightStatus === "saving"}
            >
              {weightStatus === "saving" ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={styles.weightButtonText}>Log</Text>
              )}
            </Pressable>
          </View>
          {weightMsg ? (
            <Text style={weightStatus === "error" ? styles.weightError : styles.weightSuccess}>{weightMsg}</Text>
          ) : null}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{stats.benchE1RM > 0 ? `${stats.benchE1RM}kg` : "—"}</Text>
            <Text style={styles.statLabel}>Bench e1RM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{stats.weeklyVolume >= 1000 ? `${(stats.weeklyVolume / 1000).toFixed(1)}k kg` : `${Math.round(stats.weeklyVolume)} kg`}</Text>
            <Text style={styles.statLabel}>Weekly Volume</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{stats.weeklySets}</Text>
            <Text style={styles.statLabel}>Weekly Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{stats.monthlyPRsCount}</Text>
            <Text style={styles.statLabel}>PRs (30d)</Text>
          </View>
        </View>

        {/* PR List Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Records (PRs)</Text>
          {prList.length === 0 ? (
            <Text style={styles.emptyText}>No personal records logged yet.</Text>
          ) : (
            prList.map((pr) => (
              <View key={pr.exerciseId} style={styles.prRow}>
                <Text style={styles.prName}>{pr.name}</Text>
                <View style={styles.prValCol}>
                  <Text style={styles.prWeight}>{pr.maxWeight} kg</Text>
                  <Text style={styles.prMeta}>× {pr.reps} reps</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: theme.text, marginBottom: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  scrollView: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: "48%",
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    alignItems: "center"
  },
  statVal: { fontSize: 22, fontWeight: "800", color: theme.brand, marginBottom: 4 },
  statLabel: { fontSize: 12, color: theme.textSoft },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 4 },
  weightRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  weightInput: {
    flex: 1,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    minHeight: 46
  },
  weightButton: {
    backgroundColor: theme.brand,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 24,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  weightButtonPressed: { backgroundColor: theme.brandStrong },
  weightButtonText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 15 },
  weightError: { color: theme.danger, fontSize: 13, marginTop: 8 },
  weightSuccess: { color: theme.brand, fontSize: 13, marginTop: 8 },
  emptyText: { fontSize: 14, color: theme.textSoft },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
    marginBottom: 4
  },
  prName: { fontSize: 14, color: theme.text, fontWeight: "600", flex: 1 },
  prValCol: { alignItems: "flex-end" },
  prWeight: { fontSize: 15, fontWeight: "700", color: theme.brand },
  prMeta: { fontSize: 11, color: theme.textSoft }
});
