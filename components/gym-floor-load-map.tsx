"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { SlotLoad } from "@/lib/firebase/read-models";

export function GymFloorLoadMap({ slots }: { slots: SlotLoad[] }) {
  const [activeSlotId, setActiveSlotId] = useState<"A" | "B" | "C" | "D">("D");

  const activeSlot = slots.find((s) => s.slotId === activeSlotId) || slots[0];

  const getCapacityStatus = (count: number) => {
    if (count <= 2) {
      return { label: "Quiet", color: "#10b981", percent: 20, description: "Gym floor has excellent spacing. No congestion expected." };
    }
    if (count <= 5) {
      return { label: "Moderate", color: "#fbbf24", percent: 55, description: "Typical traffic. Minor wait times for popular stations." };
    }
    return { label: "Crowded", color: "#f87171", percent: 90, description: "High demand. Squat racks and benches are highly congested." };
  };

  const activeStatus = getCapacityStatus(activeSlot.memberCount);

  // Data for the semi-circle gauge (PieChart)
  const pieData = [
    { name: "Load", value: activeStatus.percent },
    { name: "Remaining", value: 100 - activeStatus.percent }
  ];

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.02)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "16px",
      padding: "24px",
      display: "grid",
      gap: "28px",
      boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)"
    }}>
      {/* Title */}
      <div>
        <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
          Gym Floor Traffic Load Map
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-soft)" }}>
          Interactive visualization of equipment congestion levels aggregated from member training programs.
        </p>
      </div>

      {/* Slots Selection Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
        {slots.map((slot) => {
          const isActive = slot.slotId === activeSlotId;
          const status = getCapacityStatus(slot.memberCount);

          return (
            <button
              key={slot.slotId}
              onClick={() => setActiveSlotId(slot.slotId)}
              style={{
                background: isActive ? "linear-gradient(145deg, rgba(200, 241, 53, 0.15), rgba(200, 241, 53, 0.02))" : "rgba(255, 255, 255, 0.02)",
                border: isActive ? "1px solid var(--brand)" : "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "14px",
                padding: "16px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isActive ? "0 4px 20px rgba(200, 241, 53, 0.12)" : "none",
                transform: isActive ? "translateY(-2px)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }
              }}
              type="button"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isActive ? "var(--brand)" : "var(--text)" }}>
                  {slot.label}
                </span>
                <span style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: status.color,
                  boxShadow: `0 0 10px ${status.color}`
                }} />
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", lineHeight: 1 }}>{slot.time}</span>
              <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                <strong style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                  {slot.memberCount}
                </strong>
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-soft)", marginLeft: "4px" }}>active</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Slot Detailed Panel */}
      <div style={{
        background: "rgba(0, 0, 0, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "16px",
        padding: "24px",
        display: "grid",
        gridTemplateColumns: "1fr 1.5fr",
        gap: "32px",
        alignItems: "stretch"
      }}>
        {/* Occupancy Status Gauge */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Occupancy Gauge
          </span>
          
          <div style={{ position: "relative", width: "100%", height: "140px", marginTop: "10px" }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  <Cell fill={activeStatus.color} style={{ filter: `drop-shadow(0px 0px 8px ${activeStatus.color}80)` }} />
                  <Cell fill="rgba(255,255,255,0.06)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            <div style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}>
              <strong style={{ fontSize: "1.8rem", fontWeight: 800, color: activeStatus.color, lineHeight: 1 }}>
                {activeStatus.label}
              </strong>
              <span style={{ fontSize: "0.85rem", color: "var(--text-soft)", marginTop: "4px", fontWeight: 600 }}>
                {activeStatus.percent}% Load
              </span>
            </div>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-soft)", lineHeight: 1.5, margin: "10px 0 0", maxWidth: "240px" }}>
            {activeStatus.description}
          </p>

          <div style={{
            background: "rgba(200, 241, 53, 0.06)",
            border: "1px solid rgba(200, 241, 53, 0.2)",
            padding: "12px",
            borderRadius: "10px",
            fontSize: "0.78rem",
            color: "var(--text-soft)",
            lineHeight: 1.5,
            width: "100%",
            textAlign: "left",
            marginTop: "auto"
          }}>
            <strong style={{ color: "var(--brand)", display: "block", marginBottom: "4px" }}>Coaching Tip:</strong>
            {activeSlot.memberCount > 5
              ? "Overloaded bench & squat racks. Recommend shifting members to chest dumbbell presses or start on lower splits."
              : "Ample open space. Ideal slot for personal assessments and high-tempo circuits."}
          </div>
        </div>

        {/* Equipment Load Distribution Bar Chart */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, display: "block", marginBottom: "16px" }}>
            Equipment Demand Heatmap
          </span>

          {activeSlot.exercises.length > 0 ? (
            <div style={{ flex: 1, minHeight: "220px", width: "100%", minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={activeSlot.exercises}
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={activeStatus.color} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={activeStatus.color} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="exerciseName"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 500 }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "rgba(20, 20, 20, 0.9)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "var(--text)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
                    }}
                    formatter={(val: any) => [`${val} Members`, "Scheduled Demand"]}
                    labelStyle={{ color: "var(--text)", marginBottom: "6px", fontWeight: 700, fontSize: "14px" }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20} animationDuration={1000}>
                    {activeSlot.exercises.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "12px", background: "rgba(255,255,255,0.01)" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-faint)", margin: 0, fontWeight: 500 }}>
                No active program assignments scheduled for this slot.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
