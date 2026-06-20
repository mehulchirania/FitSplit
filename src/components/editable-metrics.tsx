"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Member } from "@/types/domain";
import { updateProfileMetrics } from "@/lib/firebase/actions";

export function EditableMetrics({ member }: { member: Member }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showBmiInfo, setShowBmiInfo] = useState(false);
  const [age, setAge] = useState(member.age?.toString() || "");
  const [weight, setWeight] = useState(member.weightKg?.toString() || "");
  const [height, setHeight] = useState(member.heightCm?.toString() || "");
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();
  const displayAge = isEditing ? age : member.age?.toString() || "";
  const displayWeight = isEditing ? weight : member.weightKg?.toString() || "";
  const displayHeight = isEditing ? height : member.heightCm?.toString() || "";

  // D16: Track whether the user has made changes since entering edit mode.
  const isDirty =
    isEditing &&
    (age !== (member.age?.toString() || "") ||
      weight !== (member.weightKg?.toString() || "") ||
      height !== (member.heightCm?.toString() || ""));

  // D16: Warn before tab close / browser navigation when there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const bmiValue = displayWeight && displayHeight ? Number(displayWeight) / Math.pow(Number(displayHeight) / 100, 2) : null;
  const bmi = bmiValue ? bmiValue.toFixed(1) : "--";

  const getBmiColor = (val: number | null) => {
    if (!val) return "var(--text-soft)";
    if (val < 18.5) return "var(--warning)";
    if (val < 25) return "var(--brand)";
    if (val < 30) return "var(--warning)";
    return "var(--danger)";
  };

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError("");
    const formData = new FormData();
    formData.set("memberId", member.id);
    formData.set("fullName", member.fullName);
    if (member.email) formData.set("email", member.email);
    formData.set("phone", member.phone ?? "");
    if (age) formData.set("age", age);
    if (weight) formData.set("weightKg", weight);
    if (height) formData.set("heightCm", height);
    startTransition(async () => {
      const result = await updateProfileMetrics({ status: "idle", message: "" }, formData);
      if (result.status === "success") {
        setIsEditing(false);
        router.refresh();
      } else {
        setSaveError(result.message);
      }
    });
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSave}
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
        <div style={{ display: "flex", gap: "6px", paddingBottom: "0", flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="submit" disabled={isPending} className="button button-primary" style={{ padding: "8px 14px", fontSize: "0.84rem", minHeight: "36px" }}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => { setIsEditing(false); setSaveError(""); }} className="button button-secondary" style={{ padding: "8px 10px", fontSize: "0.84rem", minHeight: "36px" }}>
              ✕
            </button>
          </div>
          {saveError && (
            <p style={{ fontSize: "0.78rem", color: "var(--danger)", margin: 0 }}>{saveError}</p>
          )}
        </div>
      </form>
    );
  }

  const stats = [
    { label: "Weight", value: displayWeight ? `${displayWeight} kg` : "—" },
    { label: "Height", value: displayHeight ? `${displayHeight} cm` : "—" },
    { label: "Age", value: displayAge || "—" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "12px", width: "100%" }}>
      {stats.map(({ label, value }) => (
        <div key={label} style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{value}</div>
        </div>
      ))}

      {/* BMI tile */}
      <div style={{ position: "relative" }}>
        <div style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${getBmiColor(bmiValue)} 15%, transparent), rgba(255,255,255,0.02))`,
          border: `1px solid color-mix(in srgb, ${getBmiColor(bmiValue)} 30%, transparent)`,
          borderRadius: "16px",
          padding: "16px",
          cursor: "help",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: `0 8px 24px color-mix(in srgb, ${getBmiColor(bmiValue)} 15%, transparent)`,
          transition: "transform 0.2s ease"
        }}
          onClick={() => setShowBmiInfo(v => !v)}
          onMouseEnter={() => setShowBmiInfo(true)}
          onMouseLeave={() => setShowBmiInfo(false)}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>BMI</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: getBmiColor(bmiValue), lineHeight: 1 }}>{bmi}</div>
        </div>
        {showBmiInfo && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 12px)", right: 0,
            background: "rgba(10, 10, 10, 0.9)", border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px", padding: "16px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            zIndex: 100, width: "220px", fontSize: "0.85rem",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)"
          }}>
            <div style={{ display: "grid", gap: "8px" }}>
              {[
                { label: "Underweight", range: "< 18.5", color: "var(--warning)" },
                { label: "Normal", range: "18.5 – 24.9", color: "var(--brand)" },
                { label: "Overweight", range: "25 – 29.9", color: "var(--warning)" },
                { label: "Obese", range: "> 30", color: "var(--danger)" },
              ].map(({ label, range, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", color, fontWeight: 600 }}>
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
        onClick={() => {
          setAge(member.age?.toString() || "");
          setWeight(member.weightKg?.toString() || "");
          setHeight(member.heightCm?.toString() || "");
          setIsEditing(true);
        }}
        title="Edit metrics"
        aria-label="Edit body metrics"
        style={{
          background: "transparent",
          border: "1px dashed rgba(255,255,255,0.2)",
          borderRadius: "16px",
          width: "100%",
          padding: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text-soft)",
          fontSize: "0.85rem",
          fontWeight: 600,
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-soft)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Edit metrics
      </button>
    </div>
  );
}
