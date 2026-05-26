"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Activity, HeartPulse } from "@/components/icons";

type MemberDashboardTabsProps = {
  workoutSection: ReactNode;
  progressSection: ReactNode;
  wellnessSection: ReactNode;
};

export function MemberDashboardTabs(props: MemberDashboardTabsProps) {
  const { workoutSection, progressSection, wellnessSection } = props;
  const [activeTab, setActiveTab] = useState<"workout" | "progress" | "wellness">("workout");

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "workout" || hash === "progress" || hash === "wellness") {
        setActiveTab(hash);
      }
    };

    // Initial check
    handleHashChange();

    // Listen for changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = (id: "workout" | "progress" | "wellness") => {
    setActiveTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const tabs = [
    { id: "workout", label: "Workout", icon: Dumbbell },
    { id: "progress", label: "Progress", icon: Activity },
    { id: "wellness", label: "Wellness", icon: HeartPulse },
  ] as const;

  return (
    <div className="md-tabs-container">
      <div className="md-tab-list" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          const content = (
            <>
              {isActive && (
                <motion.div
                  layoutId="md-tab-indicator"
                  className="md-tab-underline"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="md-tab-icon" />
              <span>{tab.label}</span>
            </>
          );

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`md-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className="md-tab-panels" style={{ position: "relative", minHeight: "400px" }}>
        <AnimatePresence mode="wait">
          {activeTab === "workout" && (
            <motion.div
              key="workout"
              role="tabpanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {workoutSection}
            </motion.div>
          )}
          {activeTab === "progress" && (
            <motion.div
              key="progress"
              role="tabpanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {progressSection}
            </motion.div>
          )}
          {activeTab === "wellness" && (
            <motion.div
              key="wellness"
              role="tabpanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {wellnessSection}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
