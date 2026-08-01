import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
  Dimensions
} from "react-native";
import { theme } from "@/lib/theme";
import type { AuthenticatedProfile } from "@/lib/auth";
import { getTodayFocus, type TodayFocus } from "@/lib/programs";
import { getLiftLogs, getDayLogs } from "@/lib/data";
import { logLiftSet, syncOfflineLifts, clearDayLog } from "@/lib/mutations";
import { enqueueLiftLog, getQueuedLiftLogs, removeQueuedLiftLogs } from "@/lib/offline-queue";
import { isOnline, addConnectivityListener } from "@/lib/network";
import type { LiftLog, DayLog, Exercise, WorkoutExercise } from "@fitsplit/core";
import {
  getWeekStart,
  SKIP_REASONS,
  getNextExerciseSwap,
  getLastLiftForExercise,
  hasLoggedWeight
} from "@fitsplit/core";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CatalogVideoPreview } from "@/components/CatalogVideoPreview";

interface WorkoutScreenProps {
  profile: AuthenticatedProfile;
}

type SetRow = { weight: string; reps: string; done: boolean; pending: boolean };
type RowsState = Record<number, SetRow[]>;

const todayKey = () => new Date().toISOString().slice(0, 10);

function buildInitialRows(dayExercises: WorkoutExercise[], liftLogs: LiftLog[]): RowsState {
  const rows: RowsState = {};
  const key = todayKey();
  dayExercises.forEach((ex, exIdx) => {
    const count = ex.sets && ex.sets > 0 ? ex.sets : 3;
    const loggedToday = liftLogs.filter(
      (l) => l.exerciseId === ex.exerciseId && l.loggedAt?.slice(0, 10) === key
    ).length;
    const doneCount = Math.min(loggedToday, count);
    const lastLift = getLastLiftForExercise(ex.exerciseId, liftLogs);
    rows[exIdx] = Array.from({ length: count }, (_, i) => ({
      weight: lastLift && hasLoggedWeight(lastLift) ? String(lastLift.weight) : "",
      reps: ex.reps ?? "8",
      done: i < doneCount,
      pending: false
    }));
  });
  return rows;
}

export default function WorkoutScreen({ profile }: WorkoutScreenProps) {
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<TodayFocus | null>(null);
  const [liftLogs, setLiftLogs] = useState<LiftLog[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLog[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Active workout states
  const [variant, setVariant] = useState<"timeline" | "ledger">("timeline");
  const [focusIndex, setFocusIndex] = useState(0);
  const [exerciseSwaps, setExerciseSwaps] = useState<Record<number, string>>({});
  const [rows, setRows] = useState<RowsState>({});
  const [elapsed, setElapsed] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(90);

  // Modals
  const [infoModalExercise, setInfoModalExercise] = useState<Exercise | null>(null);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isUndoingSkip, setIsUndoingSkip] = useState(false);

  // Offline lift queue (mirrors the web's Dexie queue — see mobile/lib/offline-queue.ts)
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  const gymId = profile.defaultGymId;
  const memberId = profile.uid;
  const weekStart = useMemo(() => getWeekStart(), []);
  const sessionId = useMemo(() => `session-${memberId}-${todayKey()}`, [memberId]);

  async function loadData() {
    setLoading(true);
    try {
      const todayFocus = await getTodayFocus(gymId, memberId);
      const lLogs = await getLiftLogs(gymId, memberId, 100);
      const dLogs = await getDayLogs(gymId, memberId, 100);

      setFocus(todayFocus);
      setLiftLogs(lLogs);
      setDayLogs(dLogs);

      if (todayFocus?.program) {
        // Default to today's day index
        const mondayFirstIndex = (new Date().getDay() + 6) % 7;
        const dayIdx = Math.min(
          Math.max(mondayFirstIndex, 0),
          Math.max(todayFocus.program.days.length - 1, 0)
        );
        setSelectedDayIndex(dayIdx);

        const day = todayFocus.program.days[dayIdx];
        if (day) {
          setRows(buildInitialRows(day.exercises, lLogs));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [profile]);

  const flushQueue = React.useCallback(async () => {
    const queue = await getQueuedLiftLogs();
    if (queue.length === 0) {
      setQueuedCount(0);
      return;
    }
    if (!(await isOnline())) {
      setQueuedCount(queue.length);
      return;
    }
    setIsSyncingQueue(true);
    try {
      await syncOfflineLifts(queue);
      await removeQueuedLiftLogs(queue.map((entry) => entry.offlineId));
      setQueuedCount(0);
    } catch (err) {
      console.error("[FitSplit] offline lift sync failed:", err);
      setQueuedCount(queue.length);
    } finally {
      setIsSyncingQueue(false);
    }
  }, []);

  // Flush on mount and whenever connectivity comes back.
  useEffect(() => {
    flushQueue();
    return addConnectivityListener((online) => {
      if (online) flushQueue();
    });
  }, [flushQueue]);

  // Timers ticking
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((s) => s + 1);
      setRestRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Update rows if day index changes
  useEffect(() => {
    if (focus?.program) {
      const day = focus.program.days[selectedDayIndex];
      if (day) {
        setRows(buildInitialRows(day.exercises, liftLogs));
        setFocusIndex(0);
        setExerciseSwaps({});
      }
    }
  }, [selectedDayIndex, focus]);

  const activeDay = focus?.program.days[selectedDayIndex] ?? null;
  const selectedDayLog = activeDay
    ? dayLogs.find((dl) => dl.dayId === activeDay.id && dl.weekStart === weekStart)
    : undefined;

  function activeExerciseIdFor(exIdx: number): string {
    return activeDay ? (exerciseSwaps[exIdx] ?? activeDay.exercises[exIdx]?.exerciseId ?? "") : "";
  }

  function handleSwap(exIdx: number) {
    if (!activeDay || !focus) return;
    const ex = activeDay.exercises[exIdx];
    if (!ex) return;
    const original = focus.exercisesById.get(ex.exerciseId);
    const currentId = activeExerciseIdFor(exIdx);
    const catalogArray = Array.from(focus.exercisesById.values());
    const next = getNextExerciseSwap(original, currentId, catalogArray);
    if (next) {
      setExerciseSwaps((curr) => ({ ...curr, [exIdx]: next.id }));
    }
  }

  async function submitSet(exIdx: number, setIdx: number) {
    if (!activeDay) return;
    const ex = activeDay.exercises[exIdx];
    const row = rows[exIdx]?.[setIdx];
    if (!ex || !row || row.done || row.pending) return;

    // Set row to pending
    setRows((r) => ({
      ...r,
      [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: true } : s))
    }));

    const activeExerciseId = activeExerciseIdFor(exIdx);
    const weight = Number(row.weight || 0);
    const reps = row.reps || "8";

    const markDone = () => {
      setRows((r) => ({
        ...r,
        [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: false, done: true } : s))
      }));
      const rest = ex.restSeconds ?? 90;
      setRestTotal(rest);
      setRestRemaining(rest);
    };

    const queueOffline = async () => {
      await enqueueLiftLog({
        gymId,
        memberId,
        exerciseId: activeExerciseId,
        weight,
        sets: 1,
        reps,
        sessionId,
        loggedAt: new Date().toISOString()
      });
      setQueuedCount((c) => c + 1);
      markDone();
    };

    if (!(await isOnline())) {
      await queueOffline();
      return;
    }

    try {
      await logLiftSet({ memberId, exerciseId: activeExerciseId, reps, weightKg: weight, sets: 1, sessionId });
      markDone();
    } catch (err) {
      // The OS reported connectivity but the write still failed (flaky signal,
      // server hiccup) — queue rather than silently dropping the set.
      console.error(err);
      try {
        await queueOffline();
      } catch (queueErr) {
        console.error(queueErr);
        setRows((r) => ({
          ...r,
          [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, pending: false } : s))
        }));
      }
    }
  }

  async function finishWorkout() {
    if (!focus || !activeDay || isFinishing) return;
    setIsFinishing(true);
    try {
      const docId = `${memberId}_${activeDay.id}_${weekStart}`;
      await setDoc(doc(db, "gyms", gymId, "dayLogs", docId), {
        memberId,
        gymId,
        programId: focus.program.id,
        dayId: activeDay.id,
        weekStart,
        status: "completed",
        note: "",
        loggedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert("Workout marked as completed!");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  }

  async function undoSkip() {
    if (!activeDay || isUndoingSkip) return;
    if (!confirm("Undo the skip for this day? You'll be able to log it again.")) return;
    setIsUndoingSkip(true);
    try {
      await clearDayLog({ dayId: activeDay.id, weekStart });
      loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not undo the skip.");
    } finally {
      setIsUndoingSkip(false);
    }
  }

  async function skipWorkout(reason: string) {
    if (!focus || !activeDay || isSkipping) return;
    setIsSkipping(true);
    try {
      const docId = `${memberId}_${activeDay.id}_${weekStart}`;
      await setDoc(doc(db, "gyms", gymId, "dayLogs", docId), {
        memberId,
        gymId,
        programId: focus.program.id,
        dayId: activeDay.id,
        weekStart,
        status: "skipped",
        skipReason: reason,
        note: "",
        loggedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setSkipModalOpen(false);
      alert("Workout skipped.");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSkipping(false);
    }
  }

  const fmtElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  if (!focus || !activeDay) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No program or active day available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Offline sync status — always visible while sets are pending upload */}
      {queuedCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            {isSyncingQueue
              ? `Syncing ${queuedCount} offline set${queuedCount === 1 ? "" : "s"}…`
              : `${queuedCount} set${queuedCount === 1 ? "" : "s"} saved offline — will sync when connected.`}
          </Text>
        </View>
      )}

      {/* Top bar with timer & view toggle */}
      <View style={styles.topHeader}>
        <View style={styles.timerRow}>
          <Text style={styles.timeLabel}>⏱️ {fmtElapsed(elapsed)}</Text>
          {restRemaining > 0 && (
            <Text style={styles.restLabel}>
              Rest: {restRemaining}s / {restTotal}s
            </Text>
          )}
        </View>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, variant === "timeline" && styles.toggleBtnActive]}
            onPress={() => setVariant("timeline")}
          >
            <Text style={[styles.toggleText, variant === "timeline" && styles.toggleTextActive]}>
              Timeline
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, variant === "ledger" && styles.toggleBtnActive]}
            onPress={() => setVariant("ledger")}
          >
            <Text style={[styles.toggleText, variant === "ledger" && styles.toggleTextActive]}>
              Ledger
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Weekday navigation tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {focus.program.days.map((d, idx) => (
            <Pressable
              key={d.id}
              style={[styles.tab, selectedDayIndex === idx && styles.tabActive]}
              onPress={() => setSelectedDayIndex(idx)}
            >
              <Text style={[styles.tabText, selectedDayIndex === idx && styles.tabTextActive]}>
                Day {idx + 1}: {d.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Exercises scrolling content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeDay.exercises.map((ex, exIdx) => {
          const activeExId = activeExerciseIdFor(exIdx);
          const catalog = focus.exercisesById.get(activeExId);
          const lastLift = getLastLiftForExercise(activeExId, liftLogs);
          const isFocused = focusIndex === exIdx;

          return (
            <View
              key={exIdx}
              style={[styles.exerciseCard, isFocused && styles.exerciseCardFocused]}
            >
              {/* Exercise Header */}
              <View style={styles.exerciseHeader}>
                <Pressable style={{ flex: 1 }} onPress={() => setFocusIndex(exIdx)}>
                  <Text style={styles.exerciseName}>{catalog?.name ?? "Exercise"}</Text>
                  <Text style={styles.exerciseMeta}>
                    {catalog?.muscleGroup} · {ex.sets} sets x {ex.reps} reps
                  </Text>
                  {catalog && (
                    <CatalogVideoPreview
                      exerciseName={catalog.name}
                      muscleGroup={catalog.muscleGroup}
                      videoUrl={catalog.videoUrl}
                      gymVideoUrl={catalog.gymVideoUrl}
                    />
                  )}
                  {lastLift && (
                    <Text style={styles.lastLiftText}>
                      Last: {lastLift.weight}kg × {lastLift.reps}
                    </Text>
                  )}
                </Pressable>
                <View style={styles.actionRow}>
                  <Pressable style={styles.headerBtn} onPress={() => handleSwap(exIdx)}>
                    <Text style={styles.headerBtnText}>🔄 Swap</Text>
                  </Pressable>
                  <Pressable
                    style={styles.headerBtn}
                    onPress={() => catalog && setInfoModalExercise(catalog)}
                  >
                    <Text style={styles.headerBtnText}>ℹ️ Info</Text>
                  </Pressable>
                </View>
              </View>

              {/* Set log rows in Timeline View */}
              {variant === "timeline" && (
                <View style={styles.setRowsList}>
                  {rows[exIdx]?.map((row, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setLabel}>Set {setIdx + 1}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="kg"
                        placeholderTextColor={theme.textSoft}
                        keyboardType="numeric"
                        value={row.weight}
                        onChangeText={(text) => {
                          setRows((r) => ({
                            ...r,
                            [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, weight: text } : s))
                          }));
                        }}
                        editable={!row.done && !row.pending}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="reps"
                        placeholderTextColor={theme.textSoft}
                        keyboardType="numeric"
                        value={row.reps}
                        onChangeText={(text) => {
                          setRows((r) => ({
                            ...r,
                            [exIdx]: r[exIdx].map((s, i) => (i === setIdx ? { ...s, reps: text } : s))
                          }));
                        }}
                        editable={!row.done && !row.pending}
                      />
                      <Pressable
                        style={[
                          styles.checkbox,
                          row.done && styles.checkboxDone,
                          row.pending && styles.checkboxPending
                        ]}
                        onPress={() => submitSet(exIdx, setIdx)}
                        disabled={row.done || row.pending}
                      >
                        {row.pending ? (
                          <ActivityIndicator size="small" color="#0A0A0A" />
                        ) : (
                          <Text style={styles.checkboxText}>{row.done ? "✓" : "Log"}</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        {selectedDayLog?.status === "skipped" ? (
          <Pressable
            style={[styles.finishBtn, isUndoingSkip && styles.finishBtnDisabled]}
            onPress={undoSkip}
            disabled={isUndoingSkip}
          >
            {isUndoingSkip ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={styles.finishBtnText}>Undo Skip</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.skipBtn} onPress={() => setSkipModalOpen(true)}>
              <Text style={styles.skipBtnText}>Skip Today</Text>
            </Pressable>
            <Pressable
              style={[styles.finishBtn, isFinishing && styles.finishBtnDisabled]}
              onPress={finishWorkout}
              disabled={isFinishing}
            >
              {isFinishing ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={styles.finishBtnText}>Finish Workout</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      {/* Info Modal */}
      <Modal visible={infoModalExercise !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{infoModalExercise?.name}</Text>
            <Text style={styles.modalSub}>{infoModalExercise?.muscleGroup} · {infoModalExercise?.equipment}</Text>
            {infoModalExercise && (
              <View style={{ marginBottom: 12 }}>
                <CatalogVideoPreview
                  exerciseName={infoModalExercise.name}
                  muscleGroup={infoModalExercise.muscleGroup}
                  videoUrl={infoModalExercise.videoUrl}
                  gymVideoUrl={infoModalExercise.gymVideoUrl}
                />
              </View>
            )}
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalBody}>
                {infoModalExercise?.instructions || "No description provided."}
              </Text>
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setInfoModalExercise(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Skip Modal */}
      <Modal visible={skipModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Skip Workout?</Text>
            <Text style={styles.modalSub}>Select a reason for skipping today's session:</Text>
            <View style={styles.skipReasonsList}>
              {SKIP_REASONS.map((reason) => (
                <Pressable
                  key={reason.value}
                  style={styles.reasonBtn}
                  onPress={() => skipWorkout(reason.value)}
                  disabled={isSkipping}
                >
                  <Text style={styles.reasonBtnText}>{reason.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={() => setSkipModalOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  error: { color: theme.danger, fontSize: 16 },
  syncBanner: {
    backgroundColor: theme.accentSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  syncBannerText: { color: theme.warning, fontSize: 12, fontWeight: "600", textAlign: "center" },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  timerRow: { gap: 2 },
  timeLabel: { fontSize: 16, fontWeight: "700", color: theme.text },
  restLabel: { fontSize: 12, color: theme.brand },
  toggleRow: { flexDirection: "row", backgroundColor: theme.accentSoft, borderRadius: 6, padding: 3 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  toggleBtnActive: { backgroundColor: theme.brand },
  toggleText: { fontSize: 13, color: theme.textSoft, fontWeight: "600" },
  toggleTextActive: { color: theme.primaryForeground },
  tabsContainer: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  tabActive: { backgroundColor: theme.brandSoft },
  tabText: { fontSize: 14, color: theme.textSoft, fontWeight: "600" },
  tabTextActive: { color: theme.brand },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  exerciseCard: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16
  },
  exerciseCardFocused: { borderColor: theme.brand },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  exerciseName: { fontSize: 18, fontWeight: "700", color: theme.text },
  exerciseMeta: { fontSize: 13, color: theme.textSoft, marginTop: 2 },
  lastLiftText: { fontSize: 12, color: theme.brand, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 8 },
  headerBtn: { backgroundColor: theme.accentSoft, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  headerBtnText: { fontSize: 12, color: theme.text },
  setRowsList: { marginTop: 12, gap: 8 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  setLabel: { flex: 1, fontSize: 14, color: theme.text, fontWeight: "600" },
  input: {
    width: 60,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    padding: 8,
    fontSize: 14,
    color: theme.text,
    textAlign: "center"
  },
  checkbox: {
    backgroundColor: theme.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radiusSm,
    minWidth: 60,
    alignItems: "center"
  },
  checkboxDone: { backgroundColor: theme.brand },
  checkboxPending: { opacity: 0.6 },
  checkboxText: { fontSize: 13, fontWeight: "700", color: theme.text },
  footer: {
    flexDirection: "row",
    backgroundColor: theme.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 16,
    gap: 12,
    paddingBottom: 28
  },
  skipBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center"
  },
  skipBtnText: { color: theme.text, fontSize: 15, fontWeight: "600" },
  finishBtn: {
    flex: 2,
    backgroundColor: theme.brand,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  finishBtnDisabled: { opacity: 0.6 },
  finishBtnText: { color: theme.primaryForeground, fontSize: 15, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: Dimensions.get("window").height * 0.7,
    gap: 12
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: theme.text },
  modalSub: { fontSize: 14, color: theme.textSoft },
  modalScroll: { marginVertical: 8 },
  modalBody: { fontSize: 15, color: theme.text, lineHeight: 22 },
  modalCloseBtn: {
    backgroundColor: theme.accentSoft,
    paddingVertical: 14,
    borderRadius: theme.radius,
    alignItems: "center",
    marginTop: 12
  },
  modalCloseText: { color: theme.text, fontSize: 15, fontWeight: "600" },
  skipReasonsList: { gap: 8, marginVertical: 12 },
  reasonBtn: { backgroundColor: theme.accentSoft, paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.radiusSm },
  reasonBtnText: { color: theme.text, fontSize: 15 }
});
