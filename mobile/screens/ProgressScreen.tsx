import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "@/lib/theme";
import ScreenError from "@/components/ScreenError";
import type { AuthenticatedProfile } from "@/lib/auth";
import { getLiftLogs, getDayLogs } from "@/lib/data";
import { getTodayFocus } from "@/lib/programs";
import { logBodyWeight } from "@/lib/mutations";
import {
  best1RM,
  buildActivityHeatmapData,
  computeWeeklyStreak,
  getTrainedDateKeys,
  getMuscleHeatmap,
  getWeekStart,
} from "@fitsplit/core";
import type { Exercise, LiftLog, MuscleGroup } from "@fitsplit/core";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";

interface ProgressScreenProps {
  profile: AuthenticatedProfile;
}

type PRItem = {
  exerciseId: string;
  name: string;
  maxWeight: number;
  maxE1RM: number;
  reps: string;
  date: string;
};

export default function ProgressScreen({ profile }: ProgressScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liftLogs, setLiftLogs] = useState<LiftLog[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(new Map());
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

      const [logs, dayLogs, focus] = await Promise.all([
        getLiftLogs(gymId, memberId, 500),
        getDayLogs(gymId, memberId, 500),
        getTodayFocus(gymId, memberId).catch(() => null),
      ]);

      setLiftLogs(logs);
      setExerciseMap(focus?.exercisesById ?? new Map<string, Exercise>());
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

  // ─── Derived stats (pure, memoised) ──────────────────────────────────────────

  const exercisesArray = useMemo(
    () => Array.from(exerciseMap.values()),
    [exerciseMap]
  );

  const weekStart = useMemo(() => getWeekStart(), []);

  const trainedDateKeys = useMemo(
    () => getTrainedDateKeys(liftLogs, []),
    [liftLogs]
  );

  const weeklyStreak = useMemo(
    () => computeWeeklyStreak(trainedDateKeys, weekStart),
    [trainedDateKeys, weekStart]
  );

  const weeklyStats = useMemo(() => {
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
    return { weeklyVolume, weeklySets };
  }, [liftLogs]);

  const prList = useMemo<PRItem[]>(() => {
    // Best e1RM per exercise (using all 3 formulas via best1RM)
    const prsMap = new Map<string, { weight: number; reps: string; e1rm: number; date: string }>();
    for (const log of liftLogs) {
      if (!log.exerciseId) continue;
      const repsNum = Number(log.reps) || 0;
      const e1rm = best1RM(log.weight, repsNum);
      const current = prsMap.get(log.exerciseId);
      if (!current || e1rm > current.e1rm) {
        prsMap.set(log.exerciseId, {
          weight: log.weight,
          reps: log.reps,
          e1rm,
          date: log.loggedAt ? log.loggedAt.slice(0, 10) : "",
        });
      }
    }
    const list: PRItem[] = [];
    prsMap.forEach((val, exId) => {
      const exName = exerciseMap.get(exId)?.name ?? "Exercise";
      list.push({
        exerciseId: exId,
        name: exName,
        maxWeight: val.weight,
        maxE1RM: val.e1rm,
        reps: val.reps,
        date: val.date,
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [liftLogs, exerciseMap]);

  const benchE1RM = useMemo(() => {
    let best = 0;
    for (const log of liftLogs) {
      const exName = exerciseMap.get(log.exerciseId)?.name.toLowerCase() ?? "";
      if (!exName.includes("bench press")) continue;
      const e1rm = best1RM(log.weight, Number(log.reps) || 0);
      if (e1rm > best) best = e1rm;
    }
    return best;
  }, [liftLogs, exerciseMap]);

  const monthlyPRsCount = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return prList.filter((pr) => pr.date && new Date(pr.date) >= thirtyDaysAgo).length;
  }, [prList]);

  const muscleHeatmap = useMemo(
    () => getMuscleHeatmap(liftLogs, exercisesArray),
    [liftLogs, exercisesArray]
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

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
            <Text style={weightStatus === "error" ? styles.weightError : styles.weightSuccess}>
              {weightMsg}
            </Text>
          ) : null}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{benchE1RM > 0 ? `${benchE1RM}kg` : "—"}</Text>
            <Text style={styles.statLabel}>Bench e1RM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>
              {weeklyStats.weeklyVolume >= 1000
                ? `${(weeklyStats.weeklyVolume / 1000).toFixed(1)}k kg`
                : `${Math.round(weeklyStats.weeklyVolume)} kg`}
            </Text>
            <Text style={styles.statLabel}>Weekly Volume</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{weeklyStats.weeklySets}</Text>
            <Text style={styles.statLabel}>Weekly Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{monthlyPRsCount}</Text>
            <Text style={styles.statLabel}>PRs (30d)</Text>
          </View>
          {/* Weekly streak — opengym-style, counts whole weeks not days */}
          <View style={[styles.statCard, styles.statCardWide]}>
            <Text style={styles.statVal}>
              {weeklyStreak > 0 ? `${weeklyStreak}🔥` : "—"}
            </Text>
            <Text style={styles.statLabel}>Week streak</Text>
          </View>
        </View>

        {/* Activity Heatmap — 12-week consistency calendar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Training consistency (12 weeks)</Text>
          <ActivityHeatmap trainedDateKeys={trainedDateKeys} />
        </View>

        {/* Muscle Heatmap — volume by body part */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Muscle emphasis</Text>
          <Text style={styles.cardSubtitle}>Based on all logged sets</Text>
          <MuscleHeatmap heatmap={muscleHeatmap} />
        </View>

        {/* PR List Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Records (PRs)</Text>
          {prList.length === 0 ? (
            <Text style={styles.emptyText}>No personal records logged yet.</Text>
          ) : (
            prList.map((pr) => (
              <View key={pr.exerciseId} style={styles.prRow}>
                <View style={styles.prNameCol}>
                  <Text style={styles.prName}>{pr.name}</Text>
                  {pr.maxE1RM > 0 && (
                    <Text style={styles.prE1rm}>e1RM ≈ {pr.maxE1RM} kg</Text>
                  )}
                </View>
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
    alignItems: "center",
  },
  statCardWide: {
    width: "100%",
  },
  statVal: { fontSize: 22, fontWeight: "800", color: theme.brand, marginBottom: 4 },
  statLabel: { fontSize: 12, color: theme.textSoft },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 0 },
  cardSubtitle: { fontSize: 12, color: theme.textSoft, marginTop: -8 },
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
    minHeight: 46,
  },
  weightButton: {
    backgroundColor: theme.brand,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 24,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 4,
  },
  prNameCol: { flex: 1, gap: 2 },
  prName: { fontSize: 14, color: theme.text, fontWeight: "600" },
  prE1rm: { fontSize: 11, color: theme.textSoft },
  prValCol: { alignItems: "flex-end" },
  prWeight: { fontSize: 15, fontWeight: "700", color: theme.brand },
  prMeta: { fontSize: 11, color: theme.textSoft },
});
