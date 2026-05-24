"use client";

import { useState } from "react";
import { Dumbbell, Activity, HeartPulse } from "@/components/icons";

export function MemberDashboardTabs({
  workoutSection,
  progressSection,
  wellnessSection
}: {
  workoutSection: React.ReactNode;
  progressSection: React.ReactNode;
  wellnessSection: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"workout" | "progress" | "wellness">("workout");

  return (
    <div className="md-tabs-container">
      <div className="md-tab-list" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "workout"}
          className={`md-tab-btn ${activeTab === "workout" ? "active" : ""}`}
          onClick={() => setActiveTab("workout")}
        >
          <Dumbbell className="md-tab-icon" />
          <span>Workout</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "progress"}
          className={`md-tab-btn ${activeTab === "progress" ? "active" : ""}`}
          onClick={() => setActiveTab("progress")}
        >
          <Activity className="md-tab-icon" />
          <span>Progress</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "wellness"}
          className={`md-tab-btn ${activeTab === "wellness" ? "active" : ""}`}
          onClick={() => setActiveTab("wellness")}
        >
          <HeartPulse className="md-tab-icon" />
          <span>Wellness</span>
        </button>
      </div>

      <div className="md-tab-panels">
        <div role="tabpanel" style={{ display: activeTab === "workout" ? "block" : "none" }}>
          {workoutSection}
        </div>
        <div role="tabpanel" style={{ display: activeTab === "progress" ? "block" : "none" }}>
          {progressSection}
        </div>
        <div role="tabpanel" style={{ display: activeTab === "wellness" ? "block" : "none" }}>
          {wellnessSection}
        </div>
      </div>
    </div>
  );
}
