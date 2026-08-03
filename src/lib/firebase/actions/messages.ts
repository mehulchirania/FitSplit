"use server";

import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { PRIMARY_GYM_ID, gymCollectionPath } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import type { CoachMessage } from "../read-models/messages";
import {
  requireFirebase,
  success,
  failure,
  mirrorGymScopedRecord,
  assertCanManageMember,
  assertMemberBelongsToCallerGym,
  getAuthProfileDoc
} from "./shared";
import { z } from "zod";

const MAX_MESSAGE_LENGTH = 1000;

const SendCoachMessageSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required."),
  body: z
    .string()
    .trim()
    .min(1, "Message can't be empty.")
    .max(MAX_MESSAGE_LENGTH, `Message is too long (${MAX_MESSAGE_LENGTH} characters max).`)
});

export type SendCoachMessageResult =
  | { status: "success"; coachMessage: CoachMessage }
  | { status: "error"; message: string };

/**
 * Resolve the gym a member's thread lives under. Members and gym staff always
 * carry their own gymId; admins (no home gym) fall back to the member's
 * profile so the message still lands in the right gym-scoped thread.
 */
async function resolveMemberGymId(
  db: ReturnType<typeof requireFirebase>,
  currentUser: Awaited<ReturnType<typeof requireAuth>>,
  memberId: string
): Promise<string> {
  if (currentUser.gymId) return currentUser.gymId;
  const profileDoc = await getAuthProfileDoc(db, memberId);
  const data = profileDoc.data() ?? {};
  return String(data.defaultGymId ?? data.gymId ?? PRIMARY_GYM_ID);
}

/**
 * Member or gym staff (owner/trainer/admin) sends a message into a member's
 * coach thread. Takes a plain object (not FormData) so the chat composer can
 * call it directly and manage optimistic/pending/failed state client-side —
 * see MemberCoachView.
 */
export async function sendCoachMessage(input: { memberId: string; body: string }): Promise<SendCoachMessageResult> {
  try {
    const currentUser = await requireAuth();
    const parsed = SendCoachMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { status: "error", message: parsed.error.issues[0]?.message ?? "Message is invalid." };
    }
    const { memberId, body } = parsed.data;

    const isMemberSender = currentUser.role === "member";
    if (isMemberSender) {
      assertCanManageMember(currentUser, memberId);
    } else {
      await assertMemberBelongsToCallerGym(currentUser, memberId);
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const senderRole: CoachMessage["senderRole"] = isMemberSender ? "member" : "trainer";

    if (!hasFirebaseAdminConfig()) {
      // Local/demo mode — nothing to persist to, but still hand back a
      // well-formed record so the UI's optimistic path resolves as "sent"
      // rather than silently pretending (the exact bug this feature fixes).
      const coachMessage: CoachMessage = {
        id,
        gymId: currentUser.gymId ?? PRIMARY_GYM_ID,
        memberId,
        threadId: memberId,
        body,
        senderRole,
        senderId: currentUser.uid,
        senderName: currentUser.fullName,
        createdAt: now,
        readAt: null
      };
      return { status: "success", coachMessage };
    }

    const db = requireFirebase();
    const gymId = await resolveMemberGymId(db, currentUser, memberId);

    const coachMessage: CoachMessage = {
      id,
      gymId,
      memberId,
      threadId: memberId,
      body,
      senderRole,
      senderId: currentUser.uid,
      senderName: currentUser.fullName,
      createdAt: now,
      readAt: null
    };

    await mirrorGymScopedRecord(db, gymId, "coachMessages", id, coachMessage);
    success("Message sent.", gymId, ["activity"]);

    return { status: "success", coachMessage };
  } catch (error) {
    console.error("Unable to send coach message", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not send message. Please try again."
    };
  }
}

/**
 * Marks every message in a member's thread that the CALLER didn't send as
 * read. Called by the member when they open the Coach tab, and (once built)
 * by the trainer-side reader when they open a member's thread.
 */
export async function markCoachThreadRead(memberId: string): Promise<FormActionState> {
  try {
    const currentUser = await requireAuth();
    const trimmedMemberId = String(memberId ?? "").trim();
    if (!trimmedMemberId) throw new Error("Member ID is required.");

    const isMemberCaller = currentUser.role === "member";
    if (isMemberCaller) {
      assertCanManageMember(currentUser, trimmedMemberId);
    } else {
      await assertMemberBelongsToCallerGym(currentUser, trimmedMemberId);
    }

    if (!hasFirebaseAdminConfig()) {
      return success("Thread marked as read.", undefined, []);
    }

    const db = requireFirebase();
    const gymId = await resolveMemberGymId(db, currentUser, trimmedMemberId);

    const snapshot = await db
      .collection(gymCollectionPath(gymId, "coachMessages"))
      .where("memberId", "==", trimmedMemberId)
      .get();

    const now = new Date().toISOString();
    const batch = db.batch();
    let updated = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.senderId !== currentUser.uid && !data.readAt) {
        batch.update(doc.ref, { readAt: now });
        updated += 1;
      }
    });
    if (updated > 0) await batch.commit();

    return success("Thread marked as read.", gymId, ["activity"]);
  } catch (error) {
    console.error("Unable to mark coach thread read", error);
    return failure(error, "Could not update the thread.");
  }
}
