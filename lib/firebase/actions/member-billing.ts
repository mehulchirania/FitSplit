"use server";

import { requireRole } from "@/lib/auth";
import { gymCollectionPath } from "../collections";
import type { FormActionState } from "@/types/action-state";
import { requireFirebase, success, failure } from "./shared";

/**
 * Member submits a payment/membership request for a package.
 * The owner then approves or rejects it to activate the membership.
 */
export async function submitPaymentRequestAction(
  gymId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const user = await requireRole(["member"]);
    if (user.gymId !== gymId) return failure(null, "You are not a member of this gym.");

    const packageId = String(formData.get("packageId") ?? "").trim();
    const method = String(formData.get("method") ?? "cash").trim();

    if (!packageId) return failure(null, "Please select a package.");
    if (!["cash", "card", "upi", "other"].includes(method)) {
      return failure(null, "Invalid payment method.");
    }

    const db = requireFirebase();
    const memberId = user.memberId ?? user.uid;

    // Load package.
    const pkgDoc = await db.collection(gymCollectionPath(gymId, "packages")).doc(packageId).get();
    if (!pkgDoc.exists) return failure(null, "Package not found.");
    const pkg = pkgDoc.data() ?? {};
    if (pkg.isActive === false) return failure(null, "This package is no longer available.");

    // Guard: don't allow duplicate pending requests for the same package.
    const existing = await db.collection(gymCollectionPath(gymId, "paymentRequests"))
      .where("memberId", "==", memberId)
      .where("packageId", "==", packageId)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!existing.empty) {
      return failure(null, "You already have a pending request for this package. Please wait for the gym to respond.");
    }

    // Get member name.
    const memberDoc = await db.collection("authProfiles").doc(memberId).get();
    const memberName = memberDoc.exists ? String(memberDoc.data()?.fullName ?? user.fullName) : user.fullName;

    const now = new Date().toISOString();
    const requestId = crypto.randomUUID();

    await db.collection(gymCollectionPath(gymId, "paymentRequests")).doc(requestId).set({
      id: requestId, gymId, memberId, memberName,
      packageId, packageName: String(pkg.name ?? ""),
      amount: Number(pkg.price ?? 0), currency: String(pkg.currency ?? "INR"),
      method, status: "pending", requestedAt: now,
    });

    // Notify gym owner.
    const ownerSnap = await db.collection(gymCollectionPath(gymId, "staff"))
      .where("role", "==", "owner").limit(1).get();
    if (!ownerSnap.empty) {
      const ownerId = ownerSnap.docs[0].id;
      await db.collection(gymCollectionPath(gymId, "notifications")).add({
        recipientId: ownerId, recipientRole: "owner",
        type: "payment_request_pending",
        title: "Payment request received",
        body: `${memberName} submitted a ${method} payment request for ${pkg.name}.`,
        actionHref: "/owner/billing?status=pending", memberId,
        createdAt: now,
      });
    }

    return success(
      `Your request for ${pkg.name} has been submitted. The gym will activate your membership once payment is confirmed.`,
      gymId,
      ["paymentRequests", "notifications"]
    );
  } catch (err) {
    return failure(err, "Failed to submit payment request.");
  }
}
