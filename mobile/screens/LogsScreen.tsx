import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from "react-native";
import { theme } from "@/lib/theme";
import ScreenError from "@/components/ScreenError";
import type { AuthenticatedProfile } from "@/lib/auth";
import { getLiftLogs, getDayLogs } from "@/lib/data";
import { getTodayFocus } from "@/lib/programs";
import type { LiftLog, DayLog, Exercise } from "@fitsplit/core";

interface LogsScreenProps {
  profile: AuthenticatedProfile;
}

type LogGroup = {
  dateStr: string;
  formattedDate: string;
  dayLog: DayLog | null;
  lifts: { exerciseName: string; sets: LiftLog[] }[];
};

export default function LogsScreen({ profile }: LogsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<LogGroup[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const gymId = profile.defaultGymId;
      const memberId = profile.uid;

      const [liftLogs, dayLogs, focus] = await Promise.all([
        getLiftLogs(gymId, memberId, 200),
        getDayLogs(gymId, memberId, 100),
        getTodayFocus(gymId, memberId).catch(() => null)
      ]);

        const exerciseMap = focus?.exercisesById || new Map<string, Exercise>();

        // Group by local YYYY-MM-DD date
        const groupedMap = new Map<string, { dayLog: DayLog | null; lifts: Map<string, LiftLog[]> }>();

        // 1. Add Day Logs
        for (const dl of dayLogs) {
          const key = dl.loggedAt.slice(0, 10);
          if (!groupedMap.has(key)) {
            groupedMap.set(key, { dayLog: dl, lifts: new Map() });
          } else {
            groupedMap.get(key)!.dayLog = dl;
          }
        }

        // 2. Add Lift Logs
        for (const ll of liftLogs) {
          if (!ll.loggedAt) continue;
          const key = ll.loggedAt.slice(0, 10);
          if (!groupedMap.has(key)) {
            groupedMap.set(key, { dayLog: null, lifts: new Map() });
          }
          const group = groupedMap.get(key)!;
          if (!group.lifts.has(ll.exerciseId)) {
            group.lifts.set(ll.exerciseId, []);
          }
          group.lifts.get(ll.exerciseId)!.push(ll);
        }

        // Convert map to sorted array
        const sortedGroups: LogGroup[] = Array.from(groupedMap.entries())
          .map(([dateStr, data]) => {
            const dateObj = new Date(dateStr);
            const formattedDate = dateObj.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            const liftsList = Array.from(data.lifts.entries()).map(([exId, sets]) => {
              const exName = exerciseMap.get(exId)?.name ?? "Exercise";
              return {
                exerciseName: exName,
                // Sort sets chronological
                sets: sets.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
              };
            });

            return {
              dateStr,
              formattedDate,
              dayLog: data.dayLog,
              lifts: liftsList
            };
          })
          .sort((a, b) => b.dateStr.localeCompare(a.dateStr));

        setGroups(sortedGroups);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not load your logs.");
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
      <Text style={styles.title}>History Logs</Text>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>No workout logs recorded yet.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.dateStr} style={styles.dateCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{group.formattedDate}</Text>
                {group.dayLog && (
                  <View
                    style={[
                      styles.statusBadge,
                      group.dayLog.status === "completed" && styles.badgeCompleted,
                      group.dayLog.status === "skipped" && styles.badgeSkipped
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        group.dayLog.status === "completed" && styles.badgeTextCompleted,
                        group.dayLog.status === "skipped" && styles.badgeTextSkipped
                      ]}
                    >
                      {group.dayLog.status.toUpperCase()}
                      {group.dayLog.skipReason ? ` (${group.dayLog.skipReason})` : ""}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.liftsList}>
                {group.lifts.map((lift, idx) => (
                  <View key={idx} style={styles.liftRow}>
                    <Text style={styles.exName}>{lift.exerciseName}</Text>
                    <View style={styles.setsList}>
                      {lift.sets.map((set, setIdx) => (
                        <Text key={setIdx} style={styles.setText}>
                          Set {setIdx + 1}: {set.weight}kg × {set.reps}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
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
  emptyText: { fontSize: 16, color: theme.textSoft, textAlign: "center", marginTop: 40 },
  dateCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 12
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 10
  },
  dateText: { fontSize: 15, fontWeight: "700", color: theme.text },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: theme.radiusSm },
  badgeCompleted: { backgroundColor: theme.brandSoft },
  badgeSkipped: { backgroundColor: theme.dangerSoft },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextCompleted: { color: theme.brand },
  badgeTextSkipped: { color: theme.danger },
  liftsList: { gap: 12 },
  liftRow: { gap: 4 },
  exName: { fontSize: 15, fontWeight: "600", color: theme.text },
  setsList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  setText: { fontSize: 13, color: theme.textSoft, backgroundColor: theme.bg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }
});
