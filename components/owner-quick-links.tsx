/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Bell, Calendar, Dumbbell } from "@/components/icons";

const MotionLink = motion(Link as any);

export function OwnerQuickLinks({
  unassignedMembersCount,
  pendingPaymentCount = 0,
  isTrainer,
  isStaff
}: {
  unassignedMembersCount: number;
  pendingPaymentCount?: number;
  isTrainer: boolean;
  isStaff: boolean;
}) {
  return (
    <nav aria-label="Dashboard actions" className="ui-cards odp-quick-links">
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
        <p className="second-text">Assign PT Plan</p>
      </MotionLink>

      {!isTrainer && !isStaff && (
        <MotionLink
          layout
          className={pendingPaymentCount > 0 ? "ui-card amber odp-ql-link is-urgent" : "ui-card gray odp-ql-link"}
          href="/owner/billing?status=pending"
        >
          <p className="tip"><Bell /></p>
          <p className="second-text">Payments</p>
          {pendingPaymentCount > 0 && (
            <em className="odp-ql-badge">{pendingPaymentCount}</em>
          )}
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

