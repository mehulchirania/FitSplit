"use client";

import { useState } from "react";
import type { Member } from "@/types/domain";

export function EditableMetrics({ member }: { member: Member }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showBmiInfo, setShowBmiInfo] = useState(false);
  const [age, setAge] = useState(member.age?.toString() || "");
  const [weight, setWeight] = useState(member.weightKg?.toString() || "");
  const [height, setHeight] = useState(member.heightCm?.toString() || "");

  const bmiValue = weight && height ? Number(weight) / Math.pow(Number(height) / 100, 2) : null;
  const bmi = bmiValue ? bmiValue.toFixed(1) : "--";

  const getBmiStatus = (val: number | null) => {
    if (!val) return "status-neutral";
    if (val < 18.5) return "status-warning"; // Underweight
    if (val < 25) return "status-active"; // Normal
    if (val < 30) return "status-warning"; // Overweight
    return "status-danger"; // Obese
  };

  const bmiStatusClass = getBmiStatus(bmiValue);

  if (isEditing) {
    return (
      <form
        className="metrics-form"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: "10px",
          marginTop: "14px",
          alignItems: "end",
        }}
        onSubmit={(e) => {
          e.preventDefault();
          setIsEditing(false);
        }}
      >
        <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem", color: "var(--text-soft)" }}>
          Age
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            inputMode="numeric"
            style={{ padding: "8px 10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)", width: "100%", minHeight: "38px" }}
          />
        </label>
        <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem", color: "var(--text-soft)" }}>
          Weight (kg)
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="decimal"
            style={{ padding: "8px 10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)", width: "100%", minHeight: "38px" }}
          />
        </label>
        <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem", color: "var(--text-soft)" }}>
          Height (cm)
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="numeric"
            style={{ padding: "8px 10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)", width: "100%", minHeight: "38px" }}
          />
        </label>
        <div style={{ display: "flex", gap: "8px", alignSelf: "end" }}>
          <button
            type="submit"
            className="button button-primary"
            style={{ padding: "8px 14px", fontSize: "0.84rem", minHeight: "38px" }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="button button-secondary"
            style={{ padding: "8px 14px", fontSize: "0.84rem", minHeight: "38px" }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ position: "relative", display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
      <span className="status-pill status-neutral">Age: {age || "--"}</span>
      <span className="status-pill status-neutral">Weight: {weight || "--"}kg</span>
      <span className="status-pill status-neutral">Height: {height || "--"}cm</span>
      
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span className={`status-pill ${bmiStatusClass}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          BMI: {bmi}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Edit metrics"
            aria-label="Edit body metrics"
            style={{
              background: "none",
              border: "none",
              color: "currentColor",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              minWidth: "20px",
              minHeight: "20px",
              opacity: 0.8
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
        </span>

        <button
          type="button"
          onMouseEnter={() => setShowBmiInfo(true)}
          onMouseLeave={() => setShowBmiInfo(false)}
          onClick={() => setShowBmiInfo(!showBmiInfo)}
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            color: "var(--text-soft)",
            cursor: "pointer"
          }}
        >
          ?
        </button>
      </div>

      {showBmiInfo && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: "0",
          marginTop: "10px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "12px",
          boxShadow: "var(--shadow)",
          zIndex: 100,
          width: "220px",
          fontSize: "0.8rem",
          animation: "dropdown-in 200ms ease-out"
        }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem" }}>BMI Categories</h4>
          <div style={{ display: "grid", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning)" }}>
              <span>Underweight</span>
              <span>&lt; 18.5</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand)" }}>
              <span>Normal</span>
              <span>18.5 – 24.9</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning)" }}>
              <span>Overweight</span>
              <span>25 – 29.9</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}>
              <span>Obese</span>
              <span>&gt; 30</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

