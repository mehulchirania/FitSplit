"use client";

import { useState } from "react";
import type { Member } from "@/types/domain";

export function EditableMetrics({ member }: { member: Member }) {
  const [isEditing, setIsEditing] = useState(false);
  const [age, setAge] = useState(member.age?.toString() || "");
  const [weight, setWeight] = useState(member.weightKg?.toString() || "");
  const [height, setHeight] = useState(member.heightCm?.toString() || "");

  const bmi =
    weight && height
      ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
      : "--";

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
    <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
      <span className="status-pill status-neutral">Age: {age || "--"}</span>
      <span className="status-pill status-neutral">Weight: {weight || "--"}kg</span>
      <span className="status-pill status-neutral">Height: {height || "--"}cm</span>
      <span className="status-pill status-active" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
      </span>
    </div>
  );
}
