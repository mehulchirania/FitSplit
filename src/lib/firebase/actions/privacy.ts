"use server";

import { requireRole } from "@/lib/auth";
import { gymCollectionPath } from "../collections";
import type { FormActionState } from "@/types/action-state";
import { requireFirebase, success, failure } from "./shared";
import {
  getMemberWithProfile,
  getBodyMetricLogsForMember,
  getLiftLogsForMember,
  getDayLogsForMember,
  getMacroLogsForMember,
  getActivityLogsForMember,
  getAttendanceRecords,
  getPTSessionsForMember,
  getMembershipsForMember,
  getPaymentRequestsForMember,
  getMemberNotifications,
  getActivityEvents,
} from "../read-models";

export type DataExportResult =
  | { status: "success"; filename: string; data: Record<string, unknown> }
  | { status: "error"; message: string };

// Large caps so the export is complete rather than the dashboard's recent-window defaults.
const ALL = 100000;

/**
 * GDPR/CCPA data-portability: gather everything FitSplit holds about the calling
 * member and return it as a serializable object the client downloads as JSON.
 * A member can only ever export their own data (memberId comes from the session).
 */
export async function exportMyData(gymId: string): Promise<DataExportResult> {
  try {
    const user = await requireRole(["member"]);
    if (user.gymId !== gymId) return { status: "error", message: "You are not a member of this gym." };
    const memberId = user.memberId ?? user.uid;

    const [
      profileRes,
      bodyMetricLogs,
      liftLogs,
      dayLogs,
      macroLogs,
      activityLogs,
      attendance,
      ptSessions,
      memberships,
      paymentRequests,
      notifications,
      activityEvents,
    ] = await Promise.all([
      getMemberWithProfile(memberId),
      getBodyMetricLogsForMember(memberId),
      getLiftLogsForMember(memberId, gymId),
      getDayLogsForMember(memberId, gymId),
      getMacroLogsForMember(memberId, gymId, ALL),
      getActivityLogsForMember(memberId, gymId, ALL),
      getAttendanceRecords(memberId),
      getPTSessionsForMember(gymId, memberId),
      getMembershipsForMember(gymId, memberId),
      getPaymentRequestsForMember(gymId, memberId),
      getMemberNotifications(memberId),
      getActivityEvents("member", memberId, gymId),
    ]);

    const data: Record<string, unknown> = {
      meta: {
        exportedAt: new Date().toISOString(),
        gymId,
        memberId,
        note: "This is a copy of the personal data FitSplit holds about you. See /privacy for details.",
      },
      account: profileRes.member,
      profile: profileRes.profile,
      bodyMetricLogs,
      liftLogs,
      dayLogs,
      macroLogs,
      activityLogs,
      attendance,
      ptSessions,
      memberships,
      paymentRequests,
      notifications,
      activityEvents,
    };

    return { status: "success", filename: `fitsplit-data-${memberId}.json`, data };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to export your data." };
  }
}

/**
 * GDPR/CCPA erasure intake: a member requests deletion of their account and data.
 * Actual deletion is a privileged operation (owner/admin via the Admin SDK), so this
 * records the request by notifying the gym owner, who actions it. The member is also
 * told they can email us directly.
 */
export async function requestAccountDeletion(
  gymId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["member"]);
    if (user.gymId !== gymId) return failure(null, "You are not a member of this gym.");

    const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
    const db = requireFirebase();
    const memberId = user.memberId ?? user.uid;
    const now = new Date().toISOString();

    // Guard against duplicate open requests.
    const existing = await db
      .collection(gymCollectionPath(gymId, "notifications"))
      .where("type", "==", "data_deletion_request")
      .where("memberId", "==", memberId)
      .limit(1)
      .get();
    if (!existing.empty) {
      return success(
        "You already have a pending deletion request. Your gym will process it; you can also email fitsplit.in@gmail.com.",
        gymId,
        ["notifications"]
      );
    }

    const ownerSnap = await db
      .collection(gymCollectionPath(gymId, "staff"))
      .where("role", "==", "owner")
      .limit(1)
      .get();
    if (!ownerSnap.empty) {
      const ownerId = ownerSnap.docs[0].id;
      await db.collection(gymCollectionPath(gymId, "notifications")).add({
        recipientId: ownerId,
        recipientRole: "owner",
        type: "data_deletion_request",
        title: "Data deletion request",
        body: `${user.fullName} requested deletion of their account and data${reason ? `: "${reason}"` : "."}`,
        actionHref: `/owner/members/${memberId}`,
        memberId,
        createdAt: now,
      });
    }

    return success(
      "Your data deletion request has been submitted. Your gym will process it and contact you. You can also email fitsplit.in@gmail.com.",
      gymId,
      ["notifications"]
    );
  } catch (err) {
    return failure(err, "Failed to submit your deletion request.");
  }
}
