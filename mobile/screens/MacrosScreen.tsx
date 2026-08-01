import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal
} from "react-native";
import { theme } from "@/lib/theme";
import type { AuthenticatedProfile } from "@/lib/auth";
import { getMealLogs } from "@/lib/data";
import type { MealLog } from "@fitsplit/core";
import { logMeal } from "@/lib/mutations";

interface MacrosScreenProps {
  profile: AuthenticatedProfile;
}

const PRESETS = [
  { name: "Whey Protein Shake", kcal: 140, protein: 25, carbs: 3, fat: 1, icon: "🥛" },
  { name: "Chicken & Rice", kcal: 550, protein: 40, carbs: 65, fat: 10, icon: "🍗" },
  { name: "Banana", kcal: 100, protein: 1, carbs: 25, fat: 0, icon: "🍌" }
];

export default function MacrosScreen({ profile }: MacrosScreenProps) {
  const [loading, setLoading] = useState(true);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  // Custom meal form states
  const [mealName, setMealName] = useState("");
  const [kcalStr, setKcalStr] = useState("");
  const [proteinStr, setProteinStr] = useState("");
  const [carbsStr, setCarbsStr] = useState("");
  const [fatStr, setFatStr] = useState("");

  const gymId = profile.defaultGymId;
  const memberId = profile.uid;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Target fallbacks
  const targets = {
    kcal: 2200,
    protein: 140,
    carbs: 230,
    fat: 70
  };

  async function loadData() {
    setLoading(true);
    try {
      const logs = await getMealLogs(gymId, memberId, todayStr);
      setMealLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [profile]);

  async function handleLogMeal(name: string, kcal: number, protein: number, carbs: number, fat: number) {
    setIsLogging(true);
    try {
      await logMeal({
        memberId,
        date: todayStr,
        name,
        kcal,
        protein,
        carbs,
        fat
      });
      setModalOpen(false);
      // Reset form
      setMealName("");
      setKcalStr("");
      setProteinStr("");
      setCarbsStr("");
      setFatStr("");

      loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to log meal.");
    } finally {
      setIsLogging(false);
    }
  }

  // Calculate totals
  const totals = mealLogs.reduce(
    (acc, m) => {
      acc.kcal += m.kcal || 0;
      acc.protein += m.protein || 0;
      acc.carbs += m.carbs || 0;
      acc.fat += m.fat || 0;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Macros Tracker</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Calorie Hero Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TODAY'S CALORIES</Text>
          <Text style={styles.calVal}>
            {totals.kcal} <Text style={styles.calTarget}>/ {targets.kcal} kcal</Text>
          </Text>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (totals.kcal / targets.kcal) * 100)}%` }
              ]}
            />
          </View>
        </View>

        {/* Macros Breakdown bars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nutrition Targets</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroLabelCol}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroSub}>
                {totals.protein}g / {targets.protein}g
              </Text>
            </View>
            <View style={styles.macroProgressBg}>
              <View
                style={[
                  styles.macroProgressFill,
                  {
                    backgroundColor: "#ef4444",
                    width: `${Math.min(100, (totals.protein / targets.protein) * 100)}%`
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroLabelCol}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroSub}>
                {totals.carbs}g / {targets.carbs}g
              </Text>
            </View>
            <View style={styles.macroProgressBg}>
              <View
                style={[
                  styles.macroProgressFill,
                  {
                    backgroundColor: "#3b82f6",
                    width: `${Math.min(100, (totals.carbs / targets.carbs) * 100)}%`
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroRowLast}>
              <View style={styles.macroLabelCol}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroSub}>
                  {totals.fat}g / {targets.fat}g
                </Text>
              </View>
              <View style={styles.macroProgressBg}>
                <View
                  style={[
                    styles.macroProgressFill,
                    {
                      backgroundColor: "#f59e0b",
                      width: `${Math.min(100, (totals.fat / targets.fat) * 100)}%`
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Add Presets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Add Presets</Text>
          <View style={styles.presetsList}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.name}
                style={styles.presetItem}
                onPress={() => handleLogMeal(p.name, p.kcal, p.protein, p.carbs, p.fat)}
                disabled={isLogging}
              >
                <Text style={styles.presetIcon}>{p.icon}</Text>
                <View style={styles.presetTextCol}>
                  <Text style={styles.presetName}>{p.name}</Text>
                  <Text style={styles.presetMeta}>
                    {p.kcal} kcal · P: {p.protein}g · C: {p.carbs}g · F: {p.fat}g
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Meal Log List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal Log (Today)</Text>
          {mealLogs.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged today yet.</Text>
          ) : (
            mealLogs.map((m) => (
              <View key={m.id} style={styles.mealRow}>
                <View style={styles.mealTextCol}>
                  <Text style={styles.mealName}>{m.name}</Text>
                  <Text style={styles.mealMeta}>
                    P: {m.protein}g · C: {m.carbs}g · F: {m.fat}g
                  </Text>
                </View>
                <Text style={styles.mealKcal}>{m.kcal} kcal</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky Log Button */}
      <View style={styles.footer}>
        <Pressable style={styles.logButton} onPress={() => setModalOpen(true)}>
          <Text style={styles.logButtonText}>+ Log Custom Meal</Text>
        </Pressable>
      </View>

      {/* Log Custom Meal Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Custom Meal</Text>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Meal Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Oats with Banana"
                  placeholderTextColor={theme.textSoft}
                  value={mealName}
                  onChangeText={setMealName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Calories (kcal)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="350"
                    placeholderTextColor={theme.textSoft}
                    keyboardType="numeric"
                    value={kcalStr}
                    onChangeText={setKcalStr}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="20"
                    placeholderTextColor={theme.textSoft}
                    keyboardType="numeric"
                    value={proteinStr}
                    onChangeText={setProteinStr}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Carbs (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="45"
                    placeholderTextColor={theme.textSoft}
                    keyboardType="numeric"
                    value={carbsStr}
                    onChangeText={setCarbsStr}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Fat (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="8"
                    placeholderTextColor={theme.textSoft}
                    keyboardType="numeric"
                    value={fatStr}
                    onChangeText={setFatStr}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.submitBtn}
                onPress={() =>
                  handleLogMeal(
                    mealName,
                    Number(kcalStr) || 0,
                    Number(proteinStr) || 0,
                    Number(carbsStr) || 0,
                    Number(fatStr) || 0
                  )
                }
                disabled={isLogging}
              >
                {isLogging ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text style={styles.submitBtnText}>Log Meal</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: theme.text, marginBottom: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  scrollView: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 20 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 12
  },
  cardLabel: { fontSize: 11, fontWeight: "700", color: theme.brand, letterSpacing: 1 },
  calVal: { fontSize: 32, fontWeight: "800", color: theme.text },
  calTarget: { fontSize: 16, color: theme.textSoft, fontWeight: "400" },
  progressBarBg: { height: 8, backgroundColor: theme.bg, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: theme.brand },
  cardTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 4 },
  macroRow: { gap: 6, marginBottom: 8 },
  macroRowLast: { gap: 6 },
  macroLabelCol: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macroLabel: { fontSize: 14, color: theme.text, fontWeight: "600" },
  macroSub: { fontSize: 12, color: theme.textSoft },
  macroProgressBg: { height: 6, backgroundColor: theme.bg, borderRadius: 3, overflow: "hidden" },
  macroProgressFill: { height: "100%" },
  presetsList: { gap: 12 },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bg,
    borderRadius: theme.radiusSm,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border
  },
  presetIcon: { fontSize: 24, marginRight: 12 },
  presetTextCol: { flex: 1 },
  presetName: { fontSize: 15, fontWeight: "600", color: theme.text },
  presetMeta: { fontSize: 12, color: theme.textSoft, marginTop: 2 },
  emptyText: { fontSize: 14, color: theme.textSoft },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
    marginBottom: 4
  },
  mealTextCol: { flex: 1 },
  mealName: { fontSize: 15, color: theme.text, fontWeight: "600" },
  mealMeta: { fontSize: 12, color: theme.textSoft, marginTop: 2 },
  mealKcal: { fontSize: 15, fontWeight: "700", color: theme.brand },
  footer: {
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 12,
    paddingBottom: 24
  },
  logButton: {
    backgroundColor: theme.brand,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center"
  },
  logButtonText: { color: theme.primaryForeground, fontSize: 15, fontWeight: "700" },
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
    gap: 16
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: theme.text },
  modalScroll: { marginVertical: 8 },
  formGroup: { gap: 6, marginBottom: 12 },
  formRow: { flexDirection: "row", gap: 12 },
  label: { fontSize: 14, color: theme.textSoft, fontWeight: "600" },
  input: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center"
  },
  cancelBtnText: { color: theme.text, fontSize: 15, fontWeight: "600" },
  submitBtn: {
    flex: 1,
    backgroundColor: theme.brand,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  submitBtnText: { color: theme.primaryForeground, fontSize: 15, fontWeight: "700" }
});
