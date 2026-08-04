/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useRef, useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { saveWaterLog } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { MacroLog, MacroNutritionTarget } from "@/types/domain";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type ActualMacros = {
  protein: number;
  carbs: number;
  fat: number;
  water: number;
};

/**
 * Daily macro summary + history. Protein/carbs/fat are READ-ONLY here — they
 * are derived entirely from mealLogs (see logMeal/deleteMealLog in
 * actions/progress.ts) and shown exactly as passed in via `initialActual`,
 * which always reflects the current server rollup. This panel used to also
 * let you nudge protein/carbs/fat with +/- steppers that wrote an absolute
 * total via saveMacroLog — that write path is gone. Two writers racing to
 * "own" the same macroLogs doc (one additive from meals, one absolute from
 * stale local panel state) is exactly what silently wiped out logged meals
 * before. Water is the one field this panel still edits directly, since it
 * isn't part of a meal — see saveWaterLog, which is field-masked to only
 * ever touch `water`.
 */
export function MacroProgressPanel({
  memberId,
  gymId,
  date,
  target,
  initialActual,
  macroHistory = []
}: {
  memberId: string;
  gymId?: string;
  date?: string;
  target?: MacroNutritionTarget;
  initialActual?: ActualMacros;
  macroHistory?: MacroLog[];
}) {
  // Protein/carbs/fat come straight from the server-derived prop on every
  // render — no local copy, so there's nothing to go stale.
  const macros = initialActual ?? { protein: 0, carbs: 0, fat: 0, water: 0 };

  // Water is the exception: the member taps +/- here directly, so we keep a
  // small optimistic local value that re-syncs whenever the server value
  // changes underneath it (meal writes never touch water, but another
  // device/tab logging water would still need to flow back in). Adjusted
  // during render (not in an effect) per React's guidance for "reset state
  // when a prop changes" — avoids an extra render pass.
  const [water, setWater] = useState(macros.water);
  const [syncedServerWater, setSyncedServerWater] = useState(macros.water);
  if (macros.water !== syncedServerWater) {
    setSyncedServerWater(macros.water);
    setWater(macros.water);
  }

  const [_isSyncing, startSyncTransition] = useTransition();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetToastFiredRef = useRef(false);

  // Debounced Firestore sync — water only. saveWaterLog is field-masked so
  // this can never touch protein/carbs/fat even if called with stale state.
  const syncWaterToFirestore = useCallback((nextWater: number) => {
    if (!gymId || !date) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("memberId", memberId);
      fd.set("date", date);
      fd.set("water", String(nextWater));
      startSyncTransition(async () => {
        await saveWaterLog(initialFormActionState, fd);
      });
    }, 800);
  }, [memberId, gymId, date]);

  const updateWater = (amount: number) => {
    setWater((prev) => {
      const next = Math.max(0, Number((prev + amount).toFixed(2)));
      syncWaterToFirestore(next);
      return next;
    });
  };

  // Default fallback macro guidelines
  const defaultTarget: Required<MacroNutritionTarget> = {
    calories: 2200,
    protein: 140,
    carbs: 240,
    fat: 70,
    waterLiters: 3.0,
    notes: "Trainer has not prescribed specific targets yet. Using general standard nutritional targets."
  };

  const caloriesGoal = target?.calories || defaultTarget.calories;
  const proteinGoal = target?.protein || defaultTarget.protein;
  const carbsGoal = target?.carbs || defaultTarget.carbs;
  const fatGoal = target?.fat || defaultTarget.fat;
  const waterGoal = target?.waterLiters || defaultTarget.waterLiters;
  const targetNotes = target?.notes || (target ? "" : defaultTarget.notes);

  // Actual calories from macros
  const actualCalories = Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9);

  const getPercent = (value: number, goal: number) => {
    if (!goal) return 0;
    return Math.min(100, Math.round((value / goal) * 100));
  };

  // Fire toast when all macro targets are met (once per session)
  useEffect(() => {
    if (targetToastFiredRef.current) return;
    const allMet =
      macros.protein >= proteinGoal &&
      macros.carbs >= carbsGoal &&
      macros.fat >= fatGoal &&
      actualCalories >= caloriesGoal;
    if (allMet && (macros.protein > 0 || macros.carbs > 0 || macros.fat > 0)) {
      targetToastFiredRef.current = true;
      toast.success("Macro target hit today.");
    }
  }, [macros, proteinGoal, carbsGoal, fatGoal, caloriesGoal, actualCalories]);

  // Build chart data from macroHistory (last 7 days, oldest first)
  const chartData = useMemo(() => {
    const sorted = [...macroHistory].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((log) => ({
      date: log.date.slice(5), // MM-DD
      Protein: log.protein,
      Carbs: log.carbs,
      Fat: log.fat,
      Calories: Math.round(log.protein * 4 + log.carbs * 4 + log.fat * 9)
    }));
  }, [macroHistory]);

  const hasHistory = chartData.length > 0;

  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: "20px",
      padding: "20px",
      display: "grid",
      gap: "20px",
      boxShadow: "var(--shadow-soft)"
    }}>
      {/* Panel title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--brand)" }}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            Daily Macro Tracker
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "var(--text-soft)" }}>
            {target ? "Trainer-prescribed targets" : "General guidelines"}
          </p>
        </div>
      </div>

      {/* Calorie ring + water */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "16px", alignItems: "center" }}>
        {/* Calorie ring */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            position: "relative",
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: `conic-gradient(var(--brand) ${getPercent(actualCalories, caloriesGoal)}%, var(--bg-subtle) 0)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <strong style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{actualCalories}</strong>
              <span style={{ fontSize: "0.62rem", color: "var(--text-faint)" }}>of {caloriesGoal}</span>
            </div>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-soft)", marginTop: "6px", display: "block" }}>kcal</span>
        </div>

        {/* Water */}
        <div style={{ display: "grid", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>Water</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--brand)" }}>{water} / {waterGoal} L</span>
          </div>
          <div style={{ height: "5px", background: "var(--bg-subtle)", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ height: "100%", width: `${getPercent(water, waterGoal)}%`, background: "linear-gradient(90deg, var(--info), var(--brand))", borderRadius: "3px", transition: "width 200ms ease" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
            {([-0.5, -0.25, 0.25, 0.5] as const).map((amt) => (
              <button
                key={amt}
                onClick={() => updateWater(amt)}
                className="button button-secondary"
                style={{ padding: "3px 0", fontSize: "0.68rem", minHeight: "22px", borderRadius: "6px" }}
                type="button"
              >
                {amt > 0 ? "+" : ""}{amt * 1000}ml
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Protein / Carbs / Fat — read-only, derived from logged meals */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {([
            { key: "protein" as const, label: "Protein", color: "var(--danger)", goal: proteinGoal, unit: "g" },
            { key: "carbs" as const, label: "Carbs", color: "var(--warning)", goal: carbsGoal, unit: "g" },
            { key: "fat" as const, label: "Fat", color: "var(--success)", goal: fatGoal, unit: "g" }
          ]).map((item) => {
            const val = macros[item.key];
            const percent = getPercent(val, item.goal);
            return (
              <div key={item.key} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px 10px", display: "grid", gap: "8px", textAlign: "center" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{item.label}</span>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "2px", margin: "4px 0 2px" }}>
                    <strong style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)" }}>{val}</strong>
                    <span style={{ fontSize: "0.64rem", color: "var(--text-soft)" }}>/{item.goal}{item.unit}</span>
                  </div>
                </div>
                <div style={{ height: "5px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ height: "100%", width: `${percent}%`, background: `linear-gradient(90deg, ${item.color}, color-mix(in srgb, ${item.color} 70%, white))`, borderRadius: "3px", transition: "width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "var(--text-faint)", lineHeight: 1.4 }}>
          Derived from meals logged above. To correct a number here, edit or delete the meal in today&apos;s meal log instead.
        </p>
      </div>

      {/* Macro history chart */}
      {hasHistory ? (
        <div>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-soft)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>7-Day History</p>
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 8px" }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-faint)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-faint)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.78rem" }}
                  labelStyle={{ color: "var(--text)", fontWeight: 700 }}
                />
                <Bar dataKey="Protein" fill="var(--danger)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Carbs" fill="var(--warning)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Fat" fill="var(--success)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* History list */}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {[...macroHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((log) => {
              const cal = Math.round(log.protein * 4 + log.carbs * 4 + log.fat * 9);
              return (
                <div key={log.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr 1fr", gap: 6, alignItems: "center", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--text-soft)", fontWeight: 600 }}>{log.date.slice(5)}</span>
                  <span style={{ color: "var(--danger)", fontWeight: 700, textAlign: "right" }}>{log.protein}g P</span>
                  <span style={{ color: "var(--warning)", fontWeight: 700, textAlign: "right" }}>{log.carbs}g C</span>
                  <span style={{ color: "var(--success)", fontWeight: 700, textAlign: "right" }}>{log.fat}g F</span>
                  <span style={{ color: "var(--text-faint)", fontWeight: 600, textAlign: "right" }}>{cal} kcal</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ alignItems: "center", color: "var(--text-faint)", display: "flex", flexDirection: "column", gap: 8, padding: "16px 0", textAlign: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-soft)", fontWeight: 600 }}>No macro history yet</p>
          <span style={{ fontSize: "0.78rem" }}>Log your macros above and they&apos;ll appear here after 1+ days.</span>
        </div>
      )}

      {/* Trainer notes */}
      {targetNotes && (
        <div style={{ background: "color-mix(in srgb, var(--brand) 6%, var(--bg-subtle))", borderLeft: "3px solid var(--brand)", borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: "0.76rem", color: "var(--text-soft)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--brand)" }}>Trainer note:</strong> {targetNotes}
        </div>
      )}
    </div>
  );
}
