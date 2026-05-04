"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Dumbbell, UsersRound } from "@/components/icons";
import type { Member, WorkoutSession } from "@/types/domain";

const activeCountKey = "fitsplit-active-workouts";

function getStoredActiveCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.localStorage.getItem(activeCountKey) ?? "0");
}

function getCapacityStatus(count: number) {
  if (count <= 2) {
    return { label: "Quiet", tone: "status-active" };
  }

  if (count <= 6) {
    return { label: "Moderate", tone: "status-expiring" };
  }

  return { label: "Busy", tone: "status-expired" };
}

export function OwnerAiCapacityPanel({
  activeHeadcount: initialActiveHeadcount,
  activeMembers,
  activeSessions,
  assignmentRate,
  members,
  programCount
}: {
  activeHeadcount: number;
  activeMembers: number;
  activeSessions: WorkoutSession[];
  assignmentRate: number;
  members: Member[];
  programCount: number;
}) {
  const router = useRouter();
  const [activeHeadcount, setActiveHeadcount] = useState(initialActiveHeadcount);
  const activeSemiPersonalPlans = Math.max(0, Math.ceil(activeMembers * assignmentRate / 100));
  const trainerHoursSaved = activeSemiPersonalPlans * 3;
  const capacityStatus = useMemo(() => getCapacityStatus(activeHeadcount), [activeHeadcount]);
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member] as const)),
    [members]
  );

  useEffect(() => {
    function syncCount() {
      setActiveHeadcount(Math.max(initialActiveHeadcount, getStoredActiveCount()));
    }

    syncCount();
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
            <Dumbbell /> Training delivery health
          </h2>
          <span className="status-pill status-active">{assignmentRate}% assigned</span>
        </div>
        <div className="stats-grid compact-stats">
          <article className="stat-card">
            <UsersRound />
            <strong>{activeSemiPersonalPlans}</strong>
            <span>Active Semi-Personal Plans</span>
          </article>
          <article className="stat-card">
            <Activity />
            <strong>{trainerHoursSaved}</strong>
            <span>Trainer Hours Saved / month</span>
          </article>
          <article className="stat-card">
            <Dumbbell />
            <strong>{programCount}</strong>
            <span>Assignable program templates</span>
          </article>
        </div>
        <p>
          This panel turns training operations into a short health check:
          assignment coverage, AI-supported coaching load, and current floor
          usage.
        </p>
      </div>

      <aside className="list-panel">
        <div className="panel-title">
          <h2>
            <Activity /> Live capacity
          </h2>
          <span className={`status-pill ${capacityStatus.tone}`}>{capacityStatus.label}</span>
        </div>
        <div className="capacity-headcount">
          <strong>{activeHeadcount}</strong>
          <span>Members currently in active workouts</span>
        </div>
        <div className="capacity-list">
          {activeSessions.length ? (
            activeSessions.slice(0, 5).map((session) => {
              const member = memberById.get(session.memberId);
              return (
                <div key={session.id}>
                  <strong>{member?.fullName ?? session.memberId}</strong>
                  <span>
                    Started {new Date(session.startedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              );
            })
          ) : (
            <p>No active workout sessions. Ask members to use Start Workout when they begin.</p>
          )}
        </div>
        <button className="button button-secondary" onClick={() => router.refresh()} type="button">
          Refresh capacity
        </button>
      </aside>
    </section>
  );
}
