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

  const getBmiColor = (val: number | null) => {
    if (!val) return "var(--text-soft)";
    if (val < 18.5) return "var(--warning)";
    if (val < 25) return "var(--brand)";
    if (val < 30) return "var(--warning)";
    return "var(--danger)";
  };

  if (isEditing) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); setIsEditing(false); }}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}
      >
        {(["Age", "Weight (kg)", "Height (cm)"] as const).map((label, i) => {
          const val = [age, weight, height][i];
          const setter = [setAge, setWeight, setHeight][i];
          return (
            <label key={label} style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</span>
              <input
                type="number"
                value={val}
                onChange={(e) => setter(e.target.value)}
                inputMode="decimal"
                style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)", width: "100%", minHeight: "36px", fontSize: "0.95rem" }}
              />
            </label>
          );
        })}
        <div style={{ display: "flex", gap: "6px", paddingBottom: "0" }}>
          <button type="submit" className="button button-primary" style={{ padding: "8px 14px", fontSize: "0.84rem", minHeight: "36px" }}>
            Save
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="button button-secondary" style={{ padding: "8px 10px", fontSize: "0.84rem", minHeight: "36px" }}>
            ✕
          </button>
        </div>
      </form>
    );
  }

  const stats = [
    { label: "Weight", value: weight ? `${weight} kg` : "—" },
    { label: "Height", value: height ? `${height} cm` : "—" },
    { label: "Age", value: age || "—" },
  ];

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "stretch", flexWrap: "wrap" }}>
      {stats.map(({ label, value }) => (
        <div key={label} style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "10px 14px",
          minWidth: "72px",
        }}>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: "4px" }}>{label}</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{value}</div>
        </div>
      ))}

      {/* BMI tile */}
      <div style={{ position: "relative" }}>
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "10px 14px",
          minWidth: "72px",
          cursor: "pointer",
        }}
          onClick={() => setShowBmiInfo(v => !v)}
          onMouseEnter={() => setShowBmiInfo(true)}
          onMouseLeave={() => setShowBmiInfo(false)}
        >
          <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: "4px" }}>BMI</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: getBmiColor(bmiValue), lineHeight: 1 }}>{bmi}</div>
        </div>
        {showBmiInfo && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 100, width: "190px", fontSize: "0.78rem",
          }}>
            <div style={{ display: "grid", gap: "5px" }}>
              {[
                { label: "Underweight", range: "< 18.5", color: "var(--warning)" },
                { label: "Normal", range: "18.5 – 24.9", color: "var(--brand)" },
                { label: "Overweight", range: "25 – 29.9", color: "var(--warning)" },
                { label: "Obese", range: "> 30", color: "var(--danger)" },
              ].map(({ label, range, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", color }}>
                  <span>{label}</span><span>{range}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit button */}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        title="Edit metrics"
        aria-label="Edit body metrics"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "10px 12px",
          color: "var(--text-faint)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "stretch",
          transition: "color 150ms, border-color 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>
    </div>
  );
}
