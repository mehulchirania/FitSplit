"use client";

import { useState } from "react";
import type { SlotLoad } from "@/lib/firebase/read-models";

export function GymFloorLoadMap({ slots }: { slots: SlotLoad[] }) {
  const [activeSlotId, setActiveSlotId] = useState<"A" | "B" | "C" | "D">("D");

  const activeSlot = slots.find((s) => s.slotId === activeSlotId) || slots[0];

  const getCapacityStatus = (count: number) => {
    if (count <= 2) {
      return { label: "Quiet", color: "#10b981", percent: 20, description: "Gym floor has excellent spacing. No congestion expected." };
    }
    if (count <= 5) {
      return { label: "Moderate", color: "#fbbf24", percent: 55, description: "Typical traffic. Minor wait times for popular cable stations." };
    }
    return { label: "Crowded", color: "#f87171", percent: 90, description: "High demand. Squat racks and flat benches are highly congested." };
  };

  const activeStatus = getCapacityStatus(activeSlot.memberCount);

  // Pre-calculate total scheduled exercises count
  const totalScheduledExercises = activeSlot.exercises.reduce((sum, item) => sum + item.count, 0);

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.02)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "16px",
      padding: "20px",
      display: "grid",
      gap: "24px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
    }}>
      {/* Title */}
      <div>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          Gym Floor Traffic Load Map
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-soft)" }}>
          Expected equipment congestion levels aggregated from member training program splits and slots.
        </p>
      </div>

      {/* Slots Selection Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
        {slots.map((slot) => {
          const isActive = slot.slotId === activeSlotId;
          const status = getCapacityStatus(slot.memberCount);

          return (
            <button
              key={slot.slotId}
              onClick={() => setActiveSlotId(slot.slotId)}
              style={{
                background: isActive ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.01)",
                border: isActive ? "1px solid var(--brand)" : "1px solid rgba(255, 255, 255, 0.04)",
                borderRadius: "12px",
                padding: "14px 12px",
                cursor: "pointer",
                textAlign: "left",
                display: "grid",
                gap: "6px",
                transition: "all 150ms ease",
                boxShadow: isActive ? "0 4px 20px rgba(200, 241, 53, 0.08)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
              }}
              type="button"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: isActive ? "var(--brand)" : "var(--text)" }}>
                  {slot.label}
                </span>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: status.color,
                  boxShadow: `0 0 8px ${status.color}`
                }} />
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", lineHeight: 1 }}>{slot.time}</span>
              <strong style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "4px" }}>
                {slot.memberCount} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-soft)" }}>active</span>
              </strong>
            </button>
          );
        })}
      </div>

      {/* Selected Slot Detailed Panel */}
      <div style={{
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        borderRadius: "12px",
        padding: "16px",
        display: "grid",
        gridTemplateColumns: "1.2fr 2fr",
        gap: "24px",
        alignItems: "start"
      }}>
        {/* Slot Health Card */}
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
              Occupancy Status
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <strong style={{ fontSize: "1.4rem", fontWeight: 800, color: activeStatus.color }}>
                {activeStatus.label}
              </strong>
              <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
                ({activeStatus.percent}% load)
              </span>
            </div>
          </div>

          {/* Simple Linear Progress indicator */}
          <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${activeStatus.percent}%`,
              background: activeStatus.color,
              borderRadius: "3px",
              transition: "width 200ms ease"
            }} />
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--text-soft)", lineHeight: 1.4, margin: 0 }}>
            {activeStatus.description}
          </p>

          {/* Aggregator recommendation */}
          <div style={{
            background: "rgba(200, 241, 53, 0.03)",
            borderLeft: "3px solid var(--brand)",
            padding: "8px 10px",
            borderRadius: "0 6px 6px 0",
            fontSize: "0.74rem",
            color: "var(--text-soft)",
            lineHeight: 1.4
          }}>
            <strong>Coaching Tip:</strong>{" "}
            {activeSlot.memberCount > 5
              ? "Overloaded bench & squat racks. Recommend shifting members to chest dumbbell presses or start on lower splits."
              : "Ample open space. Ideal slot for personal assessments and high-tempo circuits."}
          </div>
        </div>

        {/* Top Exercises Crowding Level */}
        <div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, display: "block", marginBottom: "8px" }}>
            Equipment Load Distribution
          </span>

          {activeSlot.exercises.length > 0 ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {activeSlot.exercises.map((item, idx) => {
                // Calculate percentage load based on total active in this slot
                const loadPercent = Math.min(100, Math.round((item.count / activeSlot.memberCount) * 100));
                
                return (
                  <div key={item.exerciseName} style={{ display: "grid", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>
                        {idx + 1}. {item.exerciseName}
                      </span>
                      <span style={{ color: "var(--text-soft)", fontWeight: 700 }}>
                        {item.count} scheduled
                      </span>
                    </div>
                    {/* Tiny microbar */}
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${loadPercent}%`,
                        background: activeStatus.color,
                        borderRadius: "2px"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px" }}>
              <p style={{ fontSize: "0.76rem", color: "var(--text-faint)", margin: 0 }}>
                No active program assignments scheduled for this slot.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
