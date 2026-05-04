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
        style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          // Real app would trigger a server action here to update member
          setIsEditing(false);
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          Age:
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            style={{ width: "60px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          Weight (kg):
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ width: "70px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          Height (cm):
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            style={{ width: "70px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)" }}
          />
        </label>
        <button
          type="submit"
          className="button button-primary"
          style={{ padding: "4px 12px", fontSize: "0.85rem" }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="button button-secondary"
          style={{ padding: "4px 12px", fontSize: "0.85rem" }}
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
      <span className="status-pill status-neutral">Age: {age || "--"}</span>
      <span className="status-pill status-neutral">Weight: {weight || "--"}kg</span>
      <span className="status-pill status-neutral">Height: {height || "--"}cm</span>
      <span className="status-pill status-active" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        BMI: {bmi}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          title="Edit metrics"
          style={{
            background: "none",
            border: "none",
            color: "currentColor",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
      </span>
    </div>
  );
}
