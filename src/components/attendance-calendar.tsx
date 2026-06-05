"use client";

import { AttendanceRecord } from "@/types/domain";
import { useState } from "react";

export function AttendanceCalendar({ records }: { records: AttendanceRecord[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const monthName = currentMonth.toLocaleString("default", { month: "long" });

  const attendanceDates = new Set(
    records.map(r => new Date(r.checkInAt).toISOString().slice(0, 10))
  );

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(i);
  }

  return (
    <div className="form-panel" style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0 }}>{monthName} {year}</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="button button-secondary" onClick={prevMonth} style={{ padding: "4px 8px", minWidth: "32px" }}>&lt;</button>
          <button className="button button-secondary" onClick={nextMonth} style={{ padding: "4px 8px", minWidth: "32px" }}>&gt;</button>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px",
        textAlign: "center"
      }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-soft)", padding: "4px" }}>{d}</div>
        ))}
        
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isAttended = attendanceDates.has(dateStr);
          const isToday = new Date().toISOString().slice(0, 10) === dateStr;

          return (
            <div
              key={day}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                fontSize: "0.85rem",
                background: isAttended ? "var(--brand-soft)" : isToday ? "var(--bg-subtle)" : "transparent",
                color: isAttended ? "var(--brand-strong)" : "var(--text)",
                border: isToday ? "1px solid var(--brand)" : "1px solid transparent",
                fontWeight: isAttended || isToday ? 700 : 400
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: "16px", display: "flex", gap: "12px", fontSize: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--brand-soft)" }} />
          <span>Attended</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", border: "1px solid var(--brand)" }} />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
