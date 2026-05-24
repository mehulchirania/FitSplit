"use client";

import { useEffect, useState, useMemo } from "react";
import type { MacroNutritionTarget } from "@/types/domain";

type ActualMacros = {
  protein: number;
  carbs: number;
  fat: number;
  water: number;
};

export function MacroProgressPanel({
  memberId,
  target
}: {
  memberId: string;
  target?: MacroNutritionTarget;
}) {
  const [actual, setActual] = useState<ActualMacros>({
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0
  });

  // Scoped localStorage key per member per calendar day
  const dateKey = useMemo(() => {
    const today = new Date().toDateString();
    return `fitsplit-macros-${memberId}-${today}`;
  }, [memberId]);

  // Load from localStorage on client side mount
  useEffect(() => {
    const stored = window.localStorage.getItem(dateKey);
    if (stored) {
      try {
        setActual(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse macro logs from local storage", err);
      }
    }
  }, [dateKey]);

  // Persist to local storage
  const updateActual = (key: keyof ActualMacros, amount: number) => {
    setActual((prev) => {
      const updated = {
        ...prev,
        [key]: Math.max(0, Number((prev[key] + amount).toFixed(1)))
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(dateKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Reset helper
  const handleReset = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.confirm("Are you sure you want to reset today's logged nutrition?")) {
      const resetState = { protein: 0, carbs: 0, fat: 0, water: 0 };
      setActual(resetState);
      window.localStorage.setItem(dateKey, JSON.stringify(resetState));
    }
  };

  // Default fallback macro guidelines if trainer has not prescribed custom values
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
  const notes = target?.notes || (target ? "" : defaultTarget.notes);

  // Actual calories automatically computed from protein (4 kcal/g), carbs (4 kcal/g), and fat (9 kcal/g)
  const actualCalories = Math.round(actual.protein * 4 + actual.carbs * 4 + actual.fat * 9);

  // Percentage calculations capped at 100% for progress rings/bars
  const getPercent = (value: number, goal: number) => {
    if (!goal) return 0;
    return Math.min(100, Math.round((value / goal) * 100));
  };

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "24px",
      padding: "24px",
      display: "grid",
      gap: "24px",
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)"
    }}>
      {/* Panel title and top status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--brand)" }}>🥗</span> Daily Macro Tracker
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-soft)" }}>
            {target ? "🎯 Trainer Prescribed" : "💡 General Guidelines"}
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-faint)",
            fontSize: "0.72rem",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "6px",
            transition: "all 150ms"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
          type="button"
        >
          Reset Logs
        </button>
      </div>

      {/* Main visual summary: Calorie split */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 2fr",
        gap: "20px",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid rgba(255, 255, 255, 0.04)"
      }}>
        {/* Calorie Ring display */}
        <div style={{ textAlign: "center", display: "grid", justifyItems: "center" }}>
          <div style={{
            position: "relative",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: `conic-gradient(var(--brand) ${getPercent(actualCalories, caloriesGoal)}%, rgba(255,255,255,0.06) 0)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(200, 241, 53, 0.15)"
          }}>
            {/* Center cutout */}
            <div style={{
              width: "74px",
              height: "74px",
              borderRadius: "50%",
              background: "var(--bg-subtle)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <strong style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{actualCalories}</strong>
              <span style={{ fontSize: "0.68rem", color: "var(--text-faint)", marginTop: "2px" }}>of {caloriesGoal}</span>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)", marginTop: "8px" }}>Calories (kcal)</span>
        </div>

        {/* Water tracking */}
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
              💧 Water Intake
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand)" }}>
              {actual.water} / {waterGoal} L
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${getPercent(actual.water, waterGoal)}%`,
              background: "linear-gradient(90deg, #38bdf8, var(--brand))",
              borderRadius: "4px",
              transition: "width 200ms ease"
            }} />
          </div>
          {/* Increments */}
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            <button
              onClick={() => updateActual("water", 0.25)}
              className="button button-secondary"
              style={{ flex: 1, padding: "4px 0", fontSize: "0.72rem", minHeight: "26px", borderRadius: "6px" }}
              type="button"
            >
              +250ml
            </button>
            <button
              onClick={() => updateActual("water", 0.5)}
              className="button button-secondary"
              style={{ flex: 1, padding: "4px 0", fontSize: "0.72rem", minHeight: "26px", borderRadius: "6px" }}
              type="button"
            >
              +500ml
            </button>
          </div>
        </div>
      </div>

      {/* Protein, Carbs, Fat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        {[
          { key: "protein" as const, label: "Protein", color: "#f87171", goal: proteinGoal, unit: "g", increments: [10, 25] },
          { key: "carbs" as const, label: "Carbs", color: "#fbbf24", goal: carbsGoal, unit: "g", increments: [20, 50] },
          { key: "fat" as const, label: "Fat", color: "#34d399", goal: fatGoal, unit: "g", increments: [5, 10] }
        ].map((item) => {
          const val = actual[item.key];
          const percent = getPercent(val, item.goal);
          return (
            <div
              key={item.key}
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                borderRadius: "16px",
                padding: "16px 12px",
                display: "grid",
                gap: "12px",
                textAlign: "center"
              }}
            >
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
                  {item.label}
                </span>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "2px", margin: "4px 0 2px" }}>
                  <strong style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>{val}</strong>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-soft)" }}>/{item.goal}{item.unit}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${item.color}, color-mix(in srgb, ${item.color} 40%, white))`,
                  borderRadius: "3px",
                  transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                }} />
              </div>

              {/* Quick addition buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "2px" }}>
                {item.increments.map((inc) => (
                  <button
                    key={inc}
                    onClick={() => updateActual(item.key, inc)}
                    className="button button-secondary"
                    style={{ padding: "3px 0", fontSize: "0.68rem", minHeight: "22px", borderRadius: "4px" }}
                    type="button"
                  >
                    +{inc}{item.unit}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Advisory notes */}
      {notes && (
        <div style={{
          background: "rgba(200, 241, 53, 0.03)",
          borderLeft: "3px solid var(--brand)",
          borderRadius: "0 8px 8px 0",
          padding: "10px 14px",
          fontSize: "0.76rem",
          color: "var(--text-soft)",
          lineHeight: 1.4
        }}>
          💡 <strong>Trainer Advice:</strong> {notes}
        </div>
      )}
    </div>
  );
}
