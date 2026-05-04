"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Dumbbell, UsersRound } from "@/components/icons";

const activeCountKey = "fitsplit-active-workouts";

const peakUsage = [
  { label: "6 AM", count: 3 },
  { label: "8 AM", count: 7 },
  { label: "12 PM", count: 4 },
  { label: "6 PM", count: 12 },
  { label: "8 PM", count: 9 }
];

function getStoredActiveCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.localStorage.getItem(activeCountKey) ?? "0");
}

export function OwnerAiCapacityPanel({
  activeHeadcount: initialActiveHeadcount,
  activeMembers,
  programCount
}: {
  activeHeadcount: number;
  activeMembers: number;
  programCount: number;
}) {
  const [activeHeadcount, setActiveHeadcount] = useState(initialActiveHeadcount);
  const activeSemiPersonalPlans = Math.max(2, Math.ceil(activeMembers * 0.45));
  const trainerHoursSaved = activeSemiPersonalPlans * 3;
  const maxPeak = useMemo(
    () => Math.max(...peakUsage.map((item) => item.count)),
    []
  );

  useEffect(() => {
    function syncCount() {
      setActiveHeadcount(getStoredActiveCount());
    }

    setActiveHeadcount(Math.max(initialActiveHeadcount, getStoredActiveCount()));
    window.addEventListener("storage", syncCount);
    window.addEventListener("fitsplit-capacity-change", syncCount);
    return () => {
      window.removeEventListener("storage", syncCount);
      window.removeEventListener("fitsplit-capacity-change", syncCount);
    };
  }, [initialActiveHeadcount]);

  return (
    <section className="content-grid">
      <div className="list-panel">
        <div className="panel-title">
          <h2>
            <Dumbbell /> AI Semi-Personal Trainer value
          </h2>
          <span className="status-pill status-active">Retention lever</span>
        </div>
        <div className="stats-grid compact-stats">
          <article className="stat-card">
            <UsersRound />
            <strong>{activeSemiPersonalPlans}</strong>
            <span>Active Semi-Personal Training Plans</span>
          </article>
          <article className="stat-card">
            <Activity />
            <strong>{trainerHoursSaved}</strong>
            <span>Trainer Hours Saved / month</span>
          </article>
          <article className="stat-card">
            <Dumbbell />
            <strong>{programCount}</strong>
            <span>AI-ready plan templates</span>
          </article>
        </div>
        <p>
          Injury-aware swaps position FitSplit as an automated Semi-Personal
          Trainer: members receive safer adjustments quickly, while owners keep
          oversight and reduce repetitive trainer admin.
        </p>
      </div>

      <aside className="list-panel">
        <div className="panel-title">
          <h2>
            <Activity /> Live capacity
          </h2>
          <span className="status-pill status-neutral">{activeHeadcount} active</span>
        </div>
        <div className="capacity-headcount">
          <strong>{activeHeadcount}</strong>
          <span>Active workout headcount</span>
        </div>
        <div className="usage-chart" aria-label="Peak usage chart">
          {peakUsage.map((item) => (
            <div className="usage-bar" key={item.label}>
              <span>{item.label}</span>
              <strong style={{ height: `${(item.count / maxPeak) * 100}%` }} />
              <small>{item.count}</small>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
