import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from "react-native";
import { theme } from "@/lib/theme";
import ScreenError from "@/components/ScreenError";
import type { AuthenticatedProfile } from "@/lib/auth";
import { getTodayFocus, type TodayFocus } from "@/lib/programs";
import {
  getGymDetails,
  getMemberDetails,
  getLiftLogs,
  getDayLogs,
  type GymDetails,
  type MemberDetails
} from "@/lib/data";
import type { LiftLog, DayLog } from "@fitsplit/core";

interface OverviewScreenProps {
  profile: AuthenticatedProfile;
}

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      gym: GymDetails;
      member: MemberDetails;
      focus: TodayFocus | null;
      liftLogs: LiftLog[];
      dayLogs: DayLog[];
      adherence: number;
      streak: number;
      sessionsThisWeek: number;
      recentPR: { name: string; weight: number; reps: string } | null;
    };

export default function OverviewScreen({ profile }: OverviewScreenProps) {
  const [state, setState] = useState<ScreenState>({ status: "loading" });

  async function load(cancelledRef?: { current: boolean }) {
    setState({ status: "loading" });
    try {
        const gymId = profile.defaultGymId;
        const memberId = profile.uid;

        const [gym, member, focus, liftLogs, dayLogs] = await Promise.all([
          getGymDetails(gymId),
          getMemberDetails(gymId, memberId),
          profile.role === "member" ? getTodayFocus(gymId, memberId).catch(() => null) : null,
          getLiftLogs(gymId, memberId, 100),
          getDayLogs(gymId, memberId, 100)
        ]);

        if (!gym || !member) {
          throw new Error("Failed to load profile or gym details.");
        }

        // Calculations
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        startOfWeek.setHours(0, 0, 0, 0);

        // Days trained this week
        const sessionsThisWeek = new Set(
          liftLogs
            .filter((log) => log.loggedAt && new Date(log.loggedAt) >= startOfWeek)
            .map((log) => new Date(log.loggedAt!).toDateString())
        ).size;

        // Adherence % (last 4 weeks)
        const since = new Date();
        since.setDate(since.getDate() - 28);
        const trainedDays = new Set<string>();
        for (const log of liftLogs) {
          if (!log.loggedAt) continue;
          const d = new Date(log.loggedAt);
          if (d >= since) {
            trainedDays.add(d.toISOString().slice(0, 10));
          }
        }
        for (const log of dayLogs) {
          if ((log.status === "completed" || log.status === "modified") && log.loggedAt) {
            const d = new Date(log.loggedAt);
            if (d >= since) {
              trainedDays.add(d.toISOString().slice(0, 10));
            }
          }
        }
        const weeklyTarget = 3; // default
        const adherence = Math.min(100, Math.round((trainedDays.size / (weeklyTarget * 4)) * 100));

        // Streak
        const trainedWeekKeys = new Set(
          liftLogs
            .filter((log) => log.loggedAt)
            .map((log) => {
              const d = new Date(log.loggedAt!);
              const day = (d.getDay() + 6) % 7;
              d.setDate(d.getDate() - day);
              d.setHours(0, 0, 0, 0);
              return d.toISOString().slice(0, 10);
            })
        );
        let streak = 0;
        const cursor = new Date(startOfWeek);
        while (true) {
          const key = cursor.toISOString().slice(0, 10);
          if (trainedWeekKeys.has(key)) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 7);
          } else {
            break;
          }
        }

        // Recent PR
        const maxByExercise = new Map<string, number>();
        for (const log of liftLogs) {
          if (!log.exerciseId || typeof log.weight !== "number") continue;
          const current = maxByExercise.get(log.exerciseId) ?? 0;
          if (log.weight > current) maxByExercise.set(log.exerciseId, log.weight);
        }
        let recentPR: { name: string; weight: number; reps: string } | null = null;
        const sorted = [...liftLogs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
        for (const log of sorted) {
          if (log.weight > 0 && log.weight === maxByExercise.get(log.exerciseId)) {
            const exName = focus?.exercisesById.get(log.exerciseId)?.name ?? "Lift";
            recentPR = { name: exName, weight: log.weight, reps: log.reps };
            break;
          }
        }

      if (!cancelledRef?.current) {
        setState({
          status: "success",
          gym,
          member,
          focus,
          liftLogs,
          dayLogs,
          adherence,
          streak,
          sessionsThisWeek,
          recentPR
        });
      }
    } catch (err) {
      if (!cancelledRef?.current) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "An unexpected error occurred"
        });
      }
    }
  }

  useEffect(() => {
    const cancelledRef = { current: false };
    load(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [profile]);

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  if (state.status === "error") {
    return <ScreenError message={state.message} onRetry={() => load()} />;
  }

  const { gym, focus, adherence, streak, sessionsThisWeek, recentPR } = state;
  const today = new Date();
  const startOfWeekDate = new Date(today);
  startOfWeekDate.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  startOfWeekDate.setHours(0, 0, 0, 0);

  const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const trainedDates = new Set(
    state.liftLogs.filter((l) => l.loggedAt).map((l) => l.loggedAt!.slice(0, 10))
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey, {profile.fullName.split(" ")[0]}</Text>
        <Text style={styles.gymSub}>{gym.name}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{adherence}%</Text>
          <Text style={styles.statLabel}>Adherence</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{streak}w</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{sessionsThisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>
            {recentPR ? `${recentPR.weight}kg` : "—"}
          </Text>
          <Text style={styles.statLabel}>Best PR</Text>
        </View>
      </View>

      {/* Weekly Tracker Row */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Activity</Text>
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label, idx) => {
            const d = new Date(startOfWeekDate);
            d.setDate(d.getDate() + idx);
            const key = d.toISOString().slice(0, 10);
            const isTrained = trainedDates.has(key);
            const isToday = d.toDateString() === today.toDateString();

            return (
              <View key={label} style={styles.weekdayCol}>
                <View
                  style={[
                    styles.circle,
                    isTrained && styles.circleTrained,
                    isToday && !isTrained && styles.circleToday
                  ]}
                >
                  {isTrained && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Today's Focus Card */}
      {focus?.day ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TODAY'S WORKOUT</Text>
          <Text style={styles.dayTitle}>{focus.day.title}</Text>
          <Text style={styles.programTitle}>{focus.program.title}</Text>
          <View style={styles.exercisesList}>
            {focus.day.exercises.slice(0, 3).map((ex, index) => {
              const catalog = focus.exercisesById.get(ex.exerciseId);
              return (
                <Text key={index} style={styles.exerciseItem}>
                  • {catalog?.name ?? "Exercise"} ({ex.sets}x{ex.reps})
                </Text>
              );
            })}
            {focus.day.exercises.length > 3 && (
              <Text style={styles.moreText}>+{focus.day.exercises.length - 3} more exercises</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Focus</Text>
          <Text style={styles.emptyText}>No workout scheduled for today.</Text>
        </View>
      )}

      {/* Gym Notices */}
      {gym.notices && gym.notices.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gym Announcements</Text>
          {gym.notices.slice(0, 2).map((notice, idx) => (
            <View key={idx} style={styles.noticeItem}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeBody}>{notice.body}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  header: { marginBottom: 8 },
  greeting: { fontSize: 28, fontWeight: "800", color: theme.text },
  gymSub: { fontSize: 16, color: theme.textSoft, marginTop: 4 },
  error: { color: theme.danger, fontSize: 16 },
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    alignItems: "center"
  },
  statVal: { fontSize: 20, fontWeight: "800", color: theme.brand, marginBottom: 4 },
  statLabel: { fontSize: 12, color: theme.textSoft },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 12
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: theme.text },
  cardLabel: { fontSize: 11, fontWeight: "700", color: theme.brand, letterSpacing: 1 },
  dayTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
  programTitle: { fontSize: 14, color: theme.textSoft },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  weekdayCol: { alignItems: "center", gap: 8 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: "center",
    alignItems: "center"
  },
  circleTrained: { backgroundColor: theme.brand, borderColor: theme.brand },
  circleToday: { borderColor: theme.brand },
  checkMark: { color: theme.primaryForeground, fontWeight: "800", fontSize: 14 },
  dayLabel: { fontSize: 12, color: theme.textSoft },
  dayLabelToday: { color: theme.brand, fontWeight: "700" },
  exercisesList: { gap: 6, marginTop: 4 },
  exerciseItem: { fontSize: 14, color: theme.textSoft },
  moreText: { fontSize: 12, color: theme.brand, marginTop: 4 },
  emptyText: { fontSize: 14, color: theme.textSoft },
  noticeItem: { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10, marginBottom: 10 },
  noticeTitle: { fontSize: 15, fontWeight: "600", color: theme.text, marginBottom: 4 },
  noticeBody: { fontSize: 13, color: theme.textSoft },
  moreButton: { alignSelf: "center", marginTop: 8 },
  moreButtonText: { color: theme.brand, fontSize: 14, fontWeight: "600" }
});
