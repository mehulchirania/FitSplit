"use server";

import { requireOwner } from "@/lib/auth";
import { gymCollectionPath } from "../collections";
import type { FormActionState } from "@/types/action-state";
import { z } from "zod";
import {
  requireFirebase,
  success,
  failure,
} from "./shared";
import { parseActionData } from "./validation";

// ── Package CRUD ──────────────────────────────────────────────────────────────

const PackageSchema = z.object({
  packageId: z.string().optional(),
  name: z.string().min(1, "Package name is required"),
  description: z.string().optional(),
  durationMonths: z.coerce.number().int().min(1).max(24),
  price: z.coerce.number().min(0),
  currency: z.string().default("INR"),
  includesPT: z.coerce.boolean().optional().default(false),
  ptSessionsIncluded: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function savePackage(
  gymId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    if (user.gymId !== gymId) return failure(null, "Not authorised for this gym.");

    const parsed = parseActionData(formData, PackageSchema);
    if (!parsed.success) return parsed.state;
    const data = parsed.data;

    const db = requireFirebase();
    const now = new Date().toISOString();
    const isNew = !data.packageId;
    const packageId = data.packageId ?? crypto.randomUUID();

    await db.collection(gymCollectionPath(gymId, "packages")).doc(packageId).set({
      id: packageId,
      gymId,
      name: data.name,
      description: data.description ?? null,
      durationMonths: data.durationMonths,
      price: data.price,
      currency: data.currency,
      includesPT: data.includesPT ?? false,
      ptSessionsIncluded: data.ptSessionsIncluded ?? 0,
      isActive: data.isActive ?? true,
      updatedAt: now,
      ...(isNew ? { createdAt: now } : {}),
    }, { merge: true });

    return success(`Package "${data.name}" ${isNew ? "created" : "updated"}.`, gymId, ["packages"]);
  } catch (err) {
    return failure(err, "Failed to save package.");
  }
}

export async function archivePackage(
  gymId: string,
  packageId: string
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    if (user.gymId !== gymId) return failure(null, "Not authorised for this gym.");
    const db = requireFirebase();
    await db.collection(gymCollectionPath(gymId, "packages")).doc(packageId)
      .set({ isActive: false, updatedAt: new Date().toISOString() }, { merge: true });
    return success("Package deactivated.", gymId, ["packages"]);
  } catch (err) {
    return failure(err, "Failed to deactivate package.");
  }
}

// ── Payment request resolution ────────────────────────────────────────────────

export async function approvePaymentRequestAction(
  gymId: string,
  requestId: string
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    if (user.gymId !== gymId) return failure(null, "Not authorised for this gym.");
    const db = requireFirebase();

    const reqRef = db.collection(gymCollectionPath(gymId, "paymentRequests")).doc(requestId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) return failure(null, "Payment request not found.");
    const reqData = reqDoc.data() ?? {};
    if (reqData.status !== "pending") return failure(null, "Request is not pending.");

    const pkgDoc = await db.collection(gymCollectionPath(gymId, "packages"))
      .doc(String(reqData.packageId)).get();
    if (!pkgDoc.exists) return failure(null, "Package no longer exists.");
    const pkg = pkgDoc.data() ?? {};

    const now = new Date().toISOString();
    const startDate = now.slice(0, 10);
    const endDate = addMonths(startDate, Number(pkg.durationMonths ?? 1));
    const membershipId = crypto.randomUUID();
    const memberId = String(reqData.memberId ?? "");
    const packageName = String(pkg.name ?? "");

    const batch = db.batch();
    batch.set(db.collection(gymCollectionPath(gymId, "memberships")).doc(membershipId), {
      id: membershipId, gymId, memberId,
      packageId: String(reqData.packageId), planName: packageName,
      startDate, endDate, durationMonths: Number(pkg.durationMonths ?? 1),
      status: "active", paymentRequestId: requestId,
      activatedAt: now, createdAt: now,
    });
    batch.update(reqRef, { status: "approved", resolvedAt: now, membershipId, resolvedByName: user.fullName ?? "Owner" });
    const memberUpdate = {
      membershipStatus: "active",
      membershipEndDate: endDate,
      currentPackageName: packageName,
      updatedAt: now,
    };
    batch.set(db.collection(gymCollectionPath(gymId, "members")).doc(memberId), memberUpdate, { merge: true });
    // Mirror to authProfiles.
    batch.set(db.collection("authProfiles").doc(memberId), memberUpdate, { merge: true });
    await batch.commit();

    // Notify member.
    await db.collection(gymCollectionPath(gymId, "notifications")).add({
      recipientId: memberId, recipientRole: "member",
      type: "membership_renewed",
      title: "Membership activated",
      body: `Your ${packageName} membership is active until ${endDate}.`,
      actionHref: "/member/membership", memberId,
      createdAt: now,
    });

    return success("Payment approved. Membership activated.", gymId, ["paymentRequests", "memberships", "members", "notifications"]);
  } catch (err) {
    return failure(err, "Failed to approve payment.");
  }
}

export async function rejectPaymentRequestAction(
  gymId: string,
  requestId: string,
  reason?: string
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    if (user.gymId !== gymId) return failure(null, "Not authorised for this gym.");
    const db = requireFirebase();

    const reqRef = db.collection(gymCollectionPath(gymId, "paymentRequests")).doc(requestId);
    const reqDoc = await reqRef.get();
    if (!reqDoc.exists) return failure(null, "Request not found.");
    if ((reqDoc.data() ?? {}).status !== "pending") return failure(null, "Request is not pending.");

    const now = new Date().toISOString();
    const resolvedReason = reason?.trim() || "Declined by gym.";
    await reqRef.update({ status: "rejected", resolvedAt: now, notes: resolvedReason, resolvedByName: user.fullName ?? "Owner" });

    const memberId = String((reqDoc.data() ?? {}).memberId ?? "");
    if (memberId) {
      await db.collection(gymCollectionPath(gymId, "notifications")).add({
        recipientId: memberId, recipientRole: "member",
        type: "payment_request_rejected",
        title: "Payment request declined",
        body: resolvedReason, actionHref: "/member/membership", memberId,
        createdAt: now,
      });
    }

    return success("Payment request rejected.", gymId, ["paymentRequests", "notifications"]);
  } catch (err) {
    return failure(err, "Failed to reject payment request.");
  }
}

// ── Trainer visibility ────────────────────────────────────────────────────────

export async function updateTrainerVisibilityAction(
  gymId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireOwner();
    if (user.gymId !== gymId) return failure(null, "Not authorised for this gym.");
    const visibility = String(formData.get("trainerMemberVisibility") ?? "").trim();
    if (!["assigned_only", "all_pt_members", "all_members"].includes(visibility)) {
      return failure(null, "Invalid visibility setting.");
    }
    const db = requireFirebase();
    await db.collection("gyms").doc(gymId)
      .set({ trainerMemberVisibility: visibility, updatedAt: new Date().toISOString() }, { merge: true });
    return success("Trainer visibility updated.", gymId, ["gyms"]);
  } catch (err) {
    return failure(err, "Failed to update trainer visibility.");
  }
}

// Utility — add N months to YYYY-MM-DD string.
function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
