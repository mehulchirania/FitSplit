import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { userCollectionPath, type UserCollectionKey } from "../collections";
import type { FormActionState } from "@/types/action-state";

const NOT_CONFIGURED =
  "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID plus GOOGLE_APPLICATION_CREDENTIALS (or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY) in .env.local.";

export function requireFirebase() {
  if (!hasFirebaseAdminConfig()) throw new Error(NOT_CONFIGURED);
  return getFirebaseAdminServices().db;
}

export function requireFirebaseServices() {
  if (!hasFirebaseAdminConfig()) throw new Error(NOT_CONFIGURED);
  return getFirebaseAdminServices();
}

export function parsePngDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match?.[1]) {
    throw new Error("Photo must be saved as a PNG preview before uploading.");
  }
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.byteLength > 900_000) {
    throw new Error("Photo is too large. Use the cropper preview before saving.");
  }
  return buffer;
}

export function getActionFormData(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
) {
  return maybeFormData ?? (previousStateOrFormData as FormData);
}

export function success(message: string): FormActionState {
  return { status: "success", message };
}

export function failure(error: unknown, fallback: string): FormActionState {
  // redirect() throws Error("NEXT_REDIRECT") — let it propagate so Next.js can actually redirect.
  if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
  return {
    status: "error",
    message: error instanceof Error ? error.message : fallback
  };
}

/** Reference to one document inside the signed-in user's own data: `users/{uid}/{collection}/{docId}`. */
export function userDoc(
  db: ReturnType<typeof getFirebaseAdminServices>["db"],
  uid: string,
  collection: UserCollectionKey,
  docId: string
) {
  return db.collection(userCollectionPath(uid, collection)).doc(docId);
}
