import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollectionPath } from "../collections";
import { reportReadModelError } from "./shared";

/**
 * A single message in a member <-> coach chat thread.
 * Lives at: gyms/{gymId}/coachMessages/{id}
 *
 * `threadId` is currently always `memberId` — one thread per member, member on
 * one side and any gym staff on the other. Kept as its own field so a future
 * per-topic or per-trainer thread split doesn't require a schema migration.
 */
export type CoachMessage = {
  id: string;
  gymId: string;
  memberId: string;
  threadId: string;
  body: string;
  senderRole: "member" | "trainer";
  senderId: string;
  senderName: string;
  createdAt: string;
  /** ISO timestamp the recipient(s) read this message, or null while unread. */
  readAt: string | null;
};

/**
 * Fetch a member's coach thread, oldest first (ready to render top-to-bottom).
 * Used by the member Coach tab and (eventually) the trainer-side reader.
 */
export async function getCoachThreadForMember(
  memberId: string,
  gymId: string,
  limit = 200
): Promise<{ messages: CoachMessage[] }> {
  if (!hasFirebaseAdminConfig()) return { messages: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(gymCollectionPath(gymId, "coachMessages"))
      .where("memberId", "==", memberId)
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    const messages: CoachMessage[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const senderRole: CoachMessage["senderRole"] = data.senderRole === "trainer" ? "trainer" : "member";
      return {
        id: doc.id,
        gymId: String(data.gymId ?? gymId),
        memberId: String(data.memberId ?? memberId),
        threadId: String(data.threadId ?? memberId),
        body: String(data.body ?? ""),
        senderRole,
        senderId: String(data.senderId ?? ""),
        senderName: String(data.senderName ?? (senderRole === "trainer" ? "Coach" : "Member")),
        createdAt: String(data.createdAt ?? new Date().toISOString()),
        readAt: data.readAt ? String(data.readAt) : null
      } satisfies CoachMessage;
    });

    return { messages };
  } catch (error) {
    reportReadModelError("getCoachThreadForMember", error, { memberId, gymId });
    return { messages: [] };
  }
}

/**
 * Count of trainer-sent messages in a member's thread that the member hasn't
 * read yet. Powers the Coach tab's unread badge.
 */
export async function getUnreadCoachMessageCount(memberId: string, gymId: string): Promise<number> {
  if (!hasFirebaseAdminConfig()) return 0;
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(gymCollectionPath(gymId, "coachMessages"))
      .where("memberId", "==", memberId)
      .where("senderRole", "==", "trainer")
      .get();

    return snapshot.docs.filter((doc) => !doc.data().readAt).length;
  } catch (error) {
    reportReadModelError("getUnreadCoachMessageCount", error, { memberId, gymId });
    return 0;
  }
}
