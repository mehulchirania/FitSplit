"use client";

import { useState } from "react";
import { OwnerCatalogSection } from "./owner-catalog-section";
import type { Exercise } from "@/types/domain";

interface Props {
  predefined: Exercise[];
  custom: Exercise[];
  exerciseCatalogByMuscle: Array<{ muscleGroup: string; exercises: Exercise[] }>;
}

export function ExerciseCatalogView({ predefined, custom, exerciseCatalogByMuscle }: Props) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  // Get unique muscle groups from the catalog
  const muscleGroups = ["All", ...exerciseCatalogByMuscle.map((g) => g.muscleGroup)];

  // Filter the groups based on active filter
  const filteredCatalog =
    activeFilter === "All"
      ? exerciseCatalogByMuscle
      : exerciseCatalogByMuscle.filter((g) => g.muscleGroup === activeFilter);

  return (
    <div className="catalog-view-container">
      {/* Controls Bar */}
      <div className="catalog-controls-bar">
        <div className="catalog-filter-chips">
          {muscleGroups.map((group) => (
            <button
              key={group}
              type="button"
              className={`filter-chip ${activeFilter === group ? "active" : ""}`}
              onClick={() => setActiveFilter(group)}
            >
              {group}
            </button>
          ))}
        </div>
        <div className="catalog-view-toggles">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "card" ? "active" : ""}`}
            onClick={() => setViewMode("card")}
            aria-label="Card view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`catalog-view-content mode-${viewMode}`}>
        <OwnerCatalogSection
          exercises={predefined}
          exerciseCatalogByMuscle={filteredCatalog
            .map((g) => ({
              ...g,
              exercises: g.exercises.filter((e) => e.source !== "custom"),
            }))
            .filter((g) => g.exercises.length > 0)}
          isDefaultSection
          sectionCount={predefined.length}
          sectionLabel="FitSplit catalog"
          viewMode={viewMode}
        />

        {custom.length > 0 && (
          <OwnerCatalogSection
            exercises={custom}
            exerciseCatalogByMuscle={filteredCatalog
              .map((g) => ({
                ...g,
                exercises: g.exercises.filter((e) => e.source === "custom"),
              }))
              .filter((g) => g.exercises.length > 0)}
            sectionCount={custom.length}
            sectionLabel="Custom exercises"
            viewMode={viewMode}
          />
        )}
      </div>
    </div>
  );
}
