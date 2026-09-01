"use server";

import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireOwner } from "@/lib/auth";
import { collectionPaths } from "../collections";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebaseServices,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  assertCanManageGym
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const RequestToJoinGymSchema = z.object({
  gymId: ZodHelpers.textRequired("Gym ID"),
  message: z.string().optional()
});

/**
 * Consumer-initiated request to join a gym found via the public `/discover`
 * marketplace. Creates a `gyms/{gymId}/joinRequests/{id}` doc with
 * status "pending" — firestore.rules let the requester create their own
 * pending request and read it back, and let the gym owner/admin read the
 * full queue and update it (approve/reject). This does NOT create an
 * Affiliation yet; that only happens once the owner approves (see
 * approveJoinRequest below) since gyms have physical capacity.
 */
export async function requestToJoinGym(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const user = await requireAuth();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, RequestToJoinGymSchema);
    if (!parsed.success) return parsed.state;

    const { gymId, message = "" } = parsed.data;
    const { db } = requireFirebaseServices();

    const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();
    if (!gymDoc.exists) {
      throw new Error("This gym could not be found.");
    }
    const gymData = gymDoc.data() ?? {};
    if (gymData.isPubliclyListed !== true) {
      throw new Error("This gym is not currently accepting join requests.");
    }

    // Avoid piling up duplicate pending requests from the same visitor.
    const existing = await db
      .collection(collectionPaths.gyms)
      .doc(gymId)
      .collection("joinRequests")
      .where("requesterUid", "==", user.uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!existing.empty) {
      return success("You already have a pending request for this gym.", gymId, []);
    }

    const requestId = randomUUID();
    const now = new Date().toISOString();

    await db
      .collection(collectionPaths.gyms)
      .doc(gymId)
      .collection("joinRequests")
      .doc(requestId)
      .set({
        id: requestId,
        gymId,
        gymName: String(gymData.name ?? "FitSplit gym"),
        requesterUid: user.uid,
        requesterName: user.fullName,
        requesterPhone: user.phone || undefined,
        message: message.trim() || undefined,
        status: "pending",
        requestedAt: now
      });

    return success("Your request to join has been sent to the gym owner.", gymId, []);
  } catch (error) {
    return failure(error, "Unable to send join request.");
  }
}

const ResolveJoinRequestSchema = z.object({
  gymId: ZodHelpers.textRequired("Gym ID"),
  requestId: ZodHelpers.textRequired("Request ID")
});

/**
 * Owner approves a pending join request. Atomically creates the real
 * Affiliation (authProfiles/{uid}/affiliations/{gymId}) + a gym-scoped member
 * profile doc — mirrors the write shape createMemberProfile uses in
 * members.ts — and marks the request "approved". The requester keeps their
 * existing account/uid; this only adds a new workspace membership to it.
 */
export async function approveJoinRequest(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ResolveJoinRequestSchema);
    if (!parsed.success) return parsed.state;

    const { gymId, requestId } = parsed.data;
    assertCanManageGym(currentUser, gymId);

    const { db } = requireFirebaseServices();
    const requestRef = db.collection(collectionPaths.gyms).doc(gymId).collection("joinRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new Error("Join request not found.");

    const request = requestDoc.data() ?? {};
    if (request.status !== "pending") {
      throw new Error("This request has already been resolved.");
    }

    const requesterUid = String(request.requesterUid ?? "");
    if (!requesterUid) throw new Error("This request is missing the requester's account.");

    const gymDoc = await db.collection(collectionPaths.gyms).doc(gymId).get();
    const gymName = String(gymDoc.data()?.name ?? request.gymName ?? "FitSplit gym");
    const now = new Date().toISOString();

    const memberProfile = {
      id: requesterUid,
      fullName: String(request.requesterName ?? "FitSplit member"),
      phone: request.requesterPhone ? String(request.requesterPhone) : "",
      role: "member",
      defaultGymId: gymId,
      goal: "General fitness",
      isActive: true,
      joinedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    };

    await db.runTransaction(async (txn) => {
      const affiliationRef = db
        .collection(collectionPaths.authProfiles)
        .doc(requesterUid)
        .collection("affiliations")
        .doc(gymId);

      txn.set(
        affiliationRef,
        {
          gymId,
          gymName,
          type: "business",
          role: "member",
          memberId: requesterUid,
          status: "active",
          joinedAt: now
        },
        { merge: true }
      );

      txn.set(
        scopedGymDoc(db, gymId, "members", requesterUid),
        { ...memberProfile, authUid: requesterUid, gymId, mirroredFromRootProfile: true },
        { merge: true }
      );

      txn.set(
        db.collection(collectionPaths.gyms).doc(gymId),
        { memberCount: FieldValue.increment(1), updatedAt: now },
        { merge: true }
      );

      txn.update(requestRef, {
        status: "approved",
        resolvedAt: now,
        resolvedByName: currentUser.fullName
      });
    });

    return success(`${memberProfile.fullName} has been added to your gym.`, gymId, ["members", "gyms"]);
  } catch (error) {
    return failure(error, "Unable to approve join request.");
  }
}

export async function rejectJoinRequest(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ResolveJoinRequestSchema);
    if (!parsed.success) return parsed.state;

    const { gymId, requestId } = parsed.data;
    assertCanManageGym(currentUser, gymId);

    const { db } = requireFirebaseServices();
    const requestRef = db.collection(collectionPaths.gyms).doc(gymId).collection("joinRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new Error("Join request not found.");
    if (requestDoc.data()?.status !== "pending") {
      throw new Error("This request has already been resolved.");
    }

    const now = new Date().toISOString();
    await requestRef.update({
      status: "rejected",
      resolvedAt: now,
      resolvedByName: currentUser.fullName
    });

    return success("Request declined.", gymId, []);
  } catch (error) {
    return failure(error, "Unable to decline join request.");
  }
}
