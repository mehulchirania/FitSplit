import { cache } from "react";
import { collectionPaths, userCollectionPath } from "@/lib/firebase/collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "@/lib/firebase/admin";
import { REHAB_FIELD } from "./catalog";
import { sanitizeConditionIds } from "./routine";
import { mapRehabSession, type RehabSession } from "./session";

/** The rehab conditions the signed-in user opted into (valid ids only). Empty if unreadable. */
export const getRehabConditions = cache(async function getRehabConditions(uid: string): Promise<string[]> {
  if (!hasFirebaseAdminConfig()) return [];
  try {
    const { db } = getFirebaseAdminServices();
    const doc = await db.collection(collectionPaths.users).doc(uid).get();
    return sanitizeConditionIds(doc.data()?.[REHAB_FIELD]);
  } catch (error) {
    console.error("Unable to read rehab conditions", error);
    return [];
  }
});

/** Finished rehab runs, newest first. Empty if unreadable. */
export const getRehabSessionsForMember = cache(async function getRehabSessionsForMember(uid: string, limit = 120): Promise<RehabSession[]> {
  if (!hasFirebaseAdminConfig()) return [];
  try {
    const { db } = getFirebaseAdminServices();
    const snap = await db.collection(userCollectionPath(uid, "rehabSessions")).get();
    return snap.docs
      .map((d) => mapRehabSession(d.id, d.data()))
      .filter((s): s is RehabSession => s !== null)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, limit);
  } catch (error) {
    console.error("Unable to read rehab sessions", error);
    return [];
  }
});
