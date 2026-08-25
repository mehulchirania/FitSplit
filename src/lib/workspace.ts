import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getFirebaseAdminServices } from "@/lib/firebase/admin";
import type { Affiliation, Role } from "@/types/domain";

export const ACTIVE_WORKSPACE_COOKIE = "fitsplit-active-workspace";
const WORKSPACE_COOKIE_SECRET = process.env.WORKSPACE_COOKIE_SECRET || "fitsplit-workspace-signing-key-dev-secret";

export type ActiveWorkspacePayload = {
  gymId: string;
  role: Role;
  memberId: string;
};

/**
 * Creates an HMAC signature for workspace cookie payload to prevent client tampering.
 */
export function signWorkspacePayload(payload: ActiveWorkspacePayload): string {
  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", WORKSPACE_COOKIE_SECRET).update(data).digest("base64url");
  const encodedData = Buffer.from(data).toString("base64url");
  return `${encodedData}.${signature}`;
}

/**
 * Verifies and decodes an active workspace cookie string.
 * Returns null if invalid or tampered.
 */
export function verifyWorkspaceCookie(rawCookie: string | undefined): ActiveWorkspacePayload | null {
  if (!rawCookie) return null;
  const parts = rawCookie.split(".");
  if (parts.length !== 2) return null;

  const [encodedData, signature] = parts;
  try {
    const data = Buffer.from(encodedData, "base64url").toString("utf8");
    const expectedSignature = createHmac("sha256", WORKSPACE_COOKIE_SECRET).update(data).digest("base64url");

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const parsed = JSON.parse(data);
    if (!parsed.gymId || !parsed.role || !parsed.memberId) return null;
    return parsed as ActiveWorkspacePayload;
  } catch {
    return null;
  }
}

/**
 * Reads all active affiliations for a user from authProfiles/{uid}/affiliations.
 */
export async function getUserAffiliations(uid: string): Promise<Affiliation[]> {
  try {
    const { db } = getFirebaseAdminServices();
    const snap = await db
      .collection("authProfiles")
      .doc(uid)
      .collection("affiliations")
      .where("status", "==", "active")
      .get();

    return snap.docs.map((doc) => ({
      gymId: doc.id,
      ...(doc.data() as Omit<Affiliation, "gymId">)
    }));
  } catch (err) {
    console.error("[getUserAffiliations] Failed to fetch affiliations:", err);
    return [];
  }
}

/**
 * Switches the user's active workspace by validating their affiliation and
 * setting the signed active-workspace cookie for 1 hour.
 */
export async function switchWorkspace(gymId: string) {
  const currentUser = await requireAuth();
  const { db } = getFirebaseAdminServices();

  const affiliationDoc = await db
    .collection("authProfiles")
    .doc(currentUser.uid)
    .collection("affiliations")
    .doc(gymId)
    .get();

  if (!affiliationDoc.exists || affiliationDoc.data()?.status !== "active") {
    throw new Error("You do not have an active affiliation with this workspace.");
  }

  const affiliation = affiliationDoc.data() as Affiliation;
  const payload: ActiveWorkspacePayload = {
    gymId,
    role: affiliation.role || currentUser.role || "member",
    memberId: affiliation.memberId || currentUser.memberId || currentUser.uid
  };

  const signed = signWorkspacePayload(payload);
  const cookieStore = await cookies();

  // Set signed cookie with 1h maxAge
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600 // 1 hour
  });

  // Best-effort update of activeGymId on profile
  try {
    await db.collection("authProfiles").doc(currentUser.uid).set(
      { activeGymId: gymId, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    console.warn("[switchWorkspace] activeGymId update failed (non-fatal):", err);
  }

  revalidatePath("/member");
  revalidatePath("/profile");
  revalidatePath("/owner");
  return { status: "success" as const, gymId };
}
