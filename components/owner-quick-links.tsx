/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Calendar, Dumbbell, UsersRound } from "@/components/icons";

const MotionLink = motion(Link as any);

export function OwnerQuickLinks({
  unassignedMembersCount,
  isTrainer,
  isStaff
}: {
  unassignedMembersCount: number;
  isTrainer: boolean;
  isStaff: boolean;
}) {
  return (
    <nav aria-label="Quick actions" className="ui-cards odp-quick-links">
      <MotionLink
        layout
        className={unassignedMembersCount > 0 ? "ui-card red odp-ql-link is-urgent" : "ui-card green odp-ql-link"}
        href="/owner/members?filter=no-plan&sort=oldest"
      >
        <p className="tip"><Dumbbell /></p>
        <p className="second-text">Needs Attention</p>
        {unassignedMembersCount > 0 && (
          <em className="odp-ql-badge">{unassignedMembersCount}</em>
        )}
      </MotionLink>
      
      <MotionLink layout className="ui-card green odp-ql-link" href="/owner/training?book=1">
        <p className="tip"><Calendar /></p>
        <p className="second-text">Add Personal Training</p>
      </MotionLink>
      
      <MotionLink layout className="ui-card purple odp-ql-link" href="/owner/members">
        <p className="tip"><UsersRound /></p>
        <p className="second-text">All Members</p>
      </MotionLink>
      
      <MotionLink layout className="ui-card blue odp-ql-link" href="/owner/programs">
        <p className="tip"><Activity /></p>
        <p className="second-text">Workout Plans</p>
      </MotionLink>
      
      {!isTrainer && !isStaff && (
        <MotionLink layout className="ui-card orange odp-ql-link" href="/owner/exercises">
          <p className="tip"><Dumbbell /></p>
          <p className="second-text">Exercises</p>
        </MotionLink>
      )}
      
      {!isTrainer && !isStaff && (
        <MotionLink layout className="ui-card gray odp-ql-link" href="/owner/reports">
          <p className="tip"><Activity /></p>
          <p className="second-text">Reports</p>
        </MotionLink>
      )}
    </nav>
  );
}

