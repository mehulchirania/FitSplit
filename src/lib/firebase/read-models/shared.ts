import * as Sentry from "@sentry/nextjs";

import { userCollectionPath, type UserCollectionKey } from "../collections";
import { getFirebaseAdminServices } from "../admin";

export type FirestoreDb = ReturnType<typeof getFirebaseAdminServices>["db"];

/** A collection owned by one user: `users/{uid}/{collection}`. */
export function userCollection(db: FirestoreDb, uid: string, collection: UserCollectionKey) {
  return db.collection(userCollectionPath(uid, collection));
}

/**
 * Reports a caught read-model query failure to Sentry and the server console.
 *
 * Read-models intentionally fail soft (catch -> return an empty/default result)
 * so pages keep rendering on a bad query instead of crashing. Call this from every
 * catch block that swallows a Firestore error so the failure is still visible.
 */
export function reportReadModelError(
  readModel: string,
  error: unknown,
  context?: { memberId?: string; [key: string]: string | undefined }
) {
  console.error(`[read-model:${readModel}] query failed`, error);

  const tags: Record<string, string> = { readModel };
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (value) tags[key] = value;
    }
  }

  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), { tags });
}
