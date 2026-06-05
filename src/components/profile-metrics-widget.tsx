"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ProfileMetrics } from "@/types/domain";

export function ProfileMetricsWidget({ profile }: { profile: ProfileMetrics }) {
  const weightKg = profile.weightKg;
  const heightCm = profile.heightCm;
  const age = profile.age || 30; // Default if missing
  const gender = profile.gender?.toLowerCase() || "male"; // Default

  // Calculations
  let bmi = 0;
  let bmr = 0;
  let maintenance = 0;
  let weightLoss = 0;

  if (weightKg && heightCm) {
    const heightM = heightCm / 100;
    bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    
    // Mifflin-St Jeor
    if (gender === "female") {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    }

    // Rough average multiplier for lightly active
    maintenance = Math.round(bmr * 1.375);
    weightLoss = maintenance - 500;
  }

  let bmiCategory = "";
  let bmiTheme = "theme-blue";
  if (bmi > 0) {
    if (bmi < 18.5) {
      bmiCategory = "Underweight";
      bmiTheme = "theme-blue";
    } else if (bmi < 25) {
      bmiCategory = "Normal";
      bmiTheme = "theme-green";
    } else if (bmi < 30) {
      bmiCategory = "Overweight";
      bmiTheme = "theme-yellow";
    } else {
      bmiCategory = "Obese";
      bmiTheme = "theme-red";
    }
  }

  const chartData = [
    { name: "Loss", calories: weightLoss, fill: "var(--brand-purple)" },
    { name: "Maint.", calories: maintenance, fill: "var(--brand-orange)" },
    { name: "Gain", calories: maintenance ? maintenance + 500 : 0, fill: "var(--brand-green)" }
  ].filter(d => d.calories > 0);

  return (
    <div className="profile-metrics-dashboard">
      <div className="profile-metrics-cards">
      {/* Body Core */}
      <div className={`profile-metric-card ${bmiTheme}`}>
        <div className="profile-metric-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
          <span>Body Mass & BMI</span>
        </div>
        <div className="profile-metric-value">
          {weightKg ? (
            <>
              <span className="value">{weightKg}</span>
              <span className="unit">kg</span>
            </>
          ) : (
            <span className="value text-muted">--</span>
          )}
        </div>
        <div className="profile-metric-footer">
          {bmi > 0 ? (
            <>
              <span>BMI: <strong>{bmi}</strong></span>
              <span className="profile-metric-badge">{bmiCategory}</span>
            </>
          ) : (
            <span>Height required for BMI</span>
          )}
        </div>
      </div>

      {/* Maintenance Calories */}
      <div className="profile-metric-card theme-orange">
        <div className="profile-metric-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          <span>Maintenance</span>
        </div>
        <div className="profile-metric-value">
          {maintenance ? (
            <>
              <span className="value">{maintenance}</span>
              <span className="unit">kcal</span>
            </>
          ) : (
            <span className="value text-muted">--</span>
          )}
        </div>
        <div className="profile-metric-footer">
          <span>Est. daily calories to maintain weight</span>
        </div>
      </div>

      {/* Weight Loss Target */}
      <div className="profile-metric-card theme-purple">
        <div className="profile-metric-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span>Weight Loss Target</span>
        </div>
        <div className="profile-metric-value">
          {weightLoss ? (
            <>
              <span className="value">{weightLoss}</span>
              <span className="unit">kcal</span>
            </>
          ) : (
            <span className="value text-muted">--</span>
          )}
        </div>
        <div className="profile-metric-footer">
          <span>~0.5kg loss / week (-500 kcal)</span>
        </div>
      </div>
      </div>
      
      {chartData.length > 0 && (
        <div className="profile-metric-chart-card">
          <div className="profile-metric-header" style={{ marginBottom: "16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            <span>Caloric Targets</span>
          </div>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-soft)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-soft)" }} width={50} />
                <Tooltip 
                  cursor={{ fill: "var(--surface-glass-strong)" }}
                  contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--text-strong)" }}
                />
                <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
