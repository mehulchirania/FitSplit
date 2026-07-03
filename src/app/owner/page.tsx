import { OwnerDashboardTabs } from "@/components/owner-dashboard-tabs";
import type { OwnerDashboardData, DashAction, PTSessionItem, FloorSlot } from "@/components/owner-dashboard-tabs";
import { requireRole } from "@/lib/auth";
import { PRIMARY_GYM_ID } from "@/lib/firebase/collections";
import {
  getActiveProgramAssignments,
  getActiveWorkoutSessions,
  getGymDetail,
  getMembers,
  getOwnerNotifications,
  getGymFloorLoadMap,
  getRecentSessionCounts,
  getPendingPaymentRequests,
} from "@/lib/firebase/read-models";
import { getAllPTSessionsForGym } from "@/lib/firebase/read-models/pt";

export const dynamic = "force-dynamic";

function daysFromNow(endDate?: string): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function todayLabel(): string {
  const now = new Date();
  const dow   = now.toLocaleDateString("en-US", { weekday: "long" });
  const date  = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${dow} · ${date}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default async function OwnerDashboard() {
  const currentUser = await requireRole(["admin", "owner"]);
  const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

  const [
    { members },
    { notifications: ownerNotifications },
    { gym },
    { sessions: workoutSessions },
    { assignments },
    { slots },
    sessionCounts,
    pendingPayments,
    allPTSessions,
  ] = await Promise.all([
    getMembers(gymId),
    getOwnerNotifications(gymId),
    getGymDetail(gymId),
    getActiveWorkoutSessions(gymId),
    getActiveProgramAssignments(gymId),
    getGymFloorLoadMap(gymId),
    getRecentSessionCounts(gymId),
    getPendingPaymentRequests(gymId),
    getAllPTSessionsForGym(gymId),
  ]);

  // ── Compute derived data ──────────────────────────────────────────────────

  const assignedIds = new Set(assignments.map((a) => a.memberId));

  // unassigned active members sorted oldest-join first
  const unassigned = members
    .filter((m) => m.isActive && !assignedIds.has(m.id))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  const expiredMembers  = members.filter((m) => m.membershipStatus === "expired");
  const expiringMembers = members.filter((m) => m.membershipStatus === "expiring_soon");

  // ── Build unified action queue ────────────────────────────────────────────
  const actions: DashAction[] = [
    // Expired first
    ...expiredMembers.map((m) => {
      const d = daysFromNow(m.membershipEndDate);
      return {
        id: `expired-${m.id}`,
        kind: "expired" as const,
        memberName: m.fullName,
        memberId: m.id,
        subtitle: `${m.currentPackageName ?? "Membership"} lapsed${d !== null ? ` ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago` : ""}`,
        href: `/owner/members/${m.id}`,
        ctaLabel: "Renew",
      };
    }),
    // Pending payments
    ...pendingPayments.map((p) => ({
      id: `payment-${p.id}`,
      kind: "payment" as const,
      memberName: p.memberName ?? "Unknown",
      memberId: p.memberId,
      subtitle: `${p.packageName ?? "Payment"} · ${p.currency}${p.amount.toLocaleString("en-IN")} · ${p.method}`,
      href: `/owner/billing`,
      ctaLabel: "Approve",
    })),
    // Expiring soon
    ...expiringMembers.map((m) => {
      const d = daysFromNow(m.membershipEndDate);
      return {
        id: `expiring-${m.id}`,
        kind: "expiring" as const,
        memberName: m.fullName,
        memberId: m.id,
        subtitle: `${m.currentPackageName ?? "Membership"} · expires in ${d !== null ? `${d} day${d === 1 ? "" : "s"}` : "soon"}`,
        href: `/owner/members/${m.id}`,
        ctaLabel: "View",
      };
    }),
    // No plan (active, unassigned)
    ...unassigned.map((m) => ({
      id: `noplan-${m.id}`,
      kind: "noplan" as const,
      memberName: m.fullName,
      memberId: m.id,
      subtitle: m.goal ? `Goal: ${m.goal}` : "No workout plan assigned",
      href: `/owner/members/${m.id}`,
      ctaLabel: "Assign",
    })),
  ];

  // ── Recent joins (last 7 days) ────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentJoins = members
    .filter((m) => new Date(m.joinedAt) >= sevenDaysAgo)
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      name: m.fullName,
      initials: m.avatarInitials,
      joinedAt: m.joinedAt,
      goal: m.goal ?? undefined,
    }));

  // ── PT sessions today ─────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const ptSessions: PTSessionItem[] = allPTSessions
    .filter((s) => s.scheduledAt.startsWith(todayStr) && s.status !== "cancelled")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .map((s) => ({
      id: s.id,
      time: formatTime(s.scheduledAt),
      memberName: s.memberName ?? s.memberId,
      trainerName: s.trainerName ?? undefined,
      status: s.status === "active" ? "active" : s.status === "completed" ? "completed" : "scheduled",
    }));

  // ── Floor slots ───────────────────────────────────────────────────────────
  const floor: FloorSlot[] = slots.map((sl) => ({
    slotId: sl.slotId,
    label: sl.label,
    time: sl.time,
    memberCount: sl.memberCount,
  }));

  // ── Who's training (active sessions joined with member names) ─────────────
  const memberById = new Map(members.map((m) => [m.id, m]));
  const inGym = workoutSessions.map((s) => {
    const m = memberById.get(s.memberId);
    return {
      id: s.memberId,
      name: m?.fullName ?? s.memberId,
      initials: m?.avatarInitials ?? s.memberId.slice(0, 2).toUpperCase(),
    };
  });

  // ── Membership mix (by package name) ─────────────────────────────────────
  const pkgCounts = new Map<string, number>();
  for (const m of members) {
    if (m.currentPackageName) {
      pkgCounts.set(m.currentPackageName, (pkgCounts.get(m.currentPackageName) ?? 0) + 1);
    }
  }
  const membershipMix = [...pkgCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([plan, count]) => ({ plan, count }));

  // ── Activity notifications ────────────────────────────────────────────────
  const notifications = ownerNotifications.slice(0, 12).map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt,
    type: n.type,
    actionHref: n.actionHref,
  }));

  // ── Owner name ────────────────────────────────────────────────────────────
  const firstName = currentUser.fullName.split(" ")[0] ?? currentUser.fullName;

  // Trainers share this dashboard but money data must not reach the client:
  // strip payment/renewal actions server-side and let the tabs hide Money (docs/14 U2).
  const isTrainer =
    currentUser.role === "owner" && !!currentUser.staffType && currentUser.staffType !== "owner";

  const data: OwnerDashboardData = {
    gymName: gym?.name ?? "Gym",
    ownerFirstName: firstName,
    todayLabel: todayLabel(),
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.isActive).length,
    noPlanCount: unassigned.length,
    pendingPaymentsCount: isTrainer ? 0 : pendingPayments.length,
    expiringCount: isTrainer ? 0 : expiringMembers.length,
    expiredCount: isTrainer ? 0 : expiredMembers.length,
    isTrainer,
    actions: isTrainer ? actions.filter((a) => a.kind === "noplan") : actions,
    recentJoins,
    floor,
    ptSessions,
    inGym,
    attendanceTrend: sessionCounts,
    membershipMix,
    notifications,
  };

  return <OwnerDashboardTabs data={data} />;
}
