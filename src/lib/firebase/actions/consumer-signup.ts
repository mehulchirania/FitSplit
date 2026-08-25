"use server";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { collectionPaths } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import type { Role } from "@/types/domain";

const OTP_SECRET = process.env.OTP_SECRET || "fitsplit-internal-otp-hmac-salt-key-2026";
const sessionCookieName = "fitsplit-session";
const SESSION_LONG_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

function normalizeE164(raw: string): string {
  const clean = normalizePhoneDigits(raw);
  return `+${clean}`;
}

function hashOtp(phone: string, code: string, salt: string): string {
  return createHmac("sha256", OTP_SECRET)
    .update(`${phone}:${code}:${salt}`)
    .digest("hex");
}

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const RequestOtpSchema = z.object({
  phone: z.string().min(10, "Please enter a valid 10-digit mobile number.")
});

const SignUpSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  phone: z.string().min(10, "Please enter a valid 10-digit mobile number."),
  otpCode: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
  termsAccepted: z.boolean().or(z.literal("true")).refine(Boolean, {
    message: "You must accept the terms and health disclaimer to continue."
  })
});

/**
 * Server action to request a 6-digit OTP for consumer signup.
 */
export async function requestSignupOtp(phoneInput: string): Promise<{
  status: "success" | "error";
  message: string;
  debugOtp?: string;
}> {
  try {
    const cleanDigits = normalizePhoneDigits(phoneInput);
    if (cleanDigits.length < 10) {
      return { status: "error", message: "Please enter a valid 10-digit mobile number." };
    }
    const e164 = `+${cleanDigits}`;
    const now = Date.now();

    if (!hasFirebaseAdminConfig()) {
      // Local dev simulated OTP
      return {
        status: "success",
        message: "OTP sent successfully (dev mode: use 123456).",
        debugOtp: "123456"
      };
    }

    const { db } = getFirebaseAdminServices();
    const attemptRef = db.collection("otpAttempts").doc(cleanDigits);
    const attemptDoc = await attemptRef.get();

    if (attemptDoc.exists) {
      const data = attemptDoc.data();
      const lastRequestedAt = data?.lastRequestedAt ?? 0;
      const count = data?.count ?? 0;
      const windowStart = data?.windowStart ?? now;

      if (now - lastRequestedAt < 30_000) {
        const wait = Math.ceil((30_000 - (now - lastRequestedAt)) / 1000);
        return { status: "error", message: `Please wait ${wait}s before requesting a new code.` };
      }

      if (now - windowStart < 15 * 60_000 && count >= 5) {
        return { status: "error", message: "Too many OTP requests. Please try again in 15 minutes." };
      }

      const resetWindow = now - windowStart >= 15 * 60_000;
      await attemptRef.set(
        {
          lastRequestedAt: now,
          count: resetWindow ? 1 : count + 1,
          windowStart: resetWindow ? now : windowStart
        },
        { merge: true }
      );
    } else {
      await attemptRef.set({
        lastRequestedAt: now,
        count: 1,
        windowStart: now
      });
    }

    const code = String(randomInt(100000, 999999));
    const salt = randomUUID();
    const hashedCode = hashOtp(e164, code, salt);
    const expiresAt = now + 5 * 60_000;

    await db.collection("phoneOtps").doc(cleanDigits).set({
      phone: e164,
      cleanDigits,
      salt,
      hashedCode,
      expiresAt,
      attemptsRemaining: 5,
      createdAt: new Date().toISOString()
    });

    console.log(`[requestSignupOtp] OTP generated for ${e164.slice(0, 7)}***: ${code}`);

    return {
      status: "success",
      message: "Verification code sent to your phone.",
      debugOtp: process.env.NODE_ENV !== "production" ? code : undefined
    };
  } catch (err) {
    console.error("[requestSignupOtp] Error:", err);
    return { status: "error", message: "Unable to send verification code. Please try again." };
  }
}

/**
 * Public server action for consumer signup with atomic personal-workspace provisioning.
 */
export async function signUpConsumer(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  const formData = maybeFormData instanceof FormData ? maybeFormData : (previousStateOrFormData as FormData);
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const otpCode = String(formData.get("otpCode") ?? "").trim();
  const termsAccepted = formData.get("termsAccepted") === "on" || formData.get("termsAccepted") === "true";

  const validation = SignUpSchema.safeParse({ fullName, phone, otpCode, termsAccepted });
  if (!validation.success) {
    return {
      status: "error",
      message: validation.error.issues[0]?.message ?? "Invalid signup input."
    };
  }

  const cleanDigits = normalizePhoneDigits(phone);
  const e164 = normalizeE164(phone);
  const now = new Date().toISOString();

  if (!hasFirebaseAdminConfig()) {
    // Local / offline dev fallback
    const mockUid = `consumer-${cleanDigits.slice(-6)}`;
    const cookieStore = await cookies();
    cookieStore.set("fitsplit-role", "member", { path: "/" });
    cookieStore.set("fitsplit-username", fullName, { path: "/" });
    cookieStore.set("fitsplit-gym-id", `personal-${mockUid}`, { path: "/" });
    cookieStore.set("fitsplit-member-id", mockUid, { path: "/" });

    return {
      status: "success",
      message: "Welcome to FitSplit!"
    };
  }

  const { auth, db } = getFirebaseAdminServices();

  // 1. Verify OTP code
  const otpDocRef = db.collection("phoneOtps").doc(cleanDigits);
  const otpDoc = await otpDocRef.get();

  if (!otpDoc.exists) {
    // Check if dev fallback 123456
    if (process.env.NODE_ENV !== "production" && otpCode === "123456") {
      // Allow dev test code
    } else {
      return { status: "error", message: "OTP expired or not found. Please request a new code." };
    }
  } else {
    const otpData = otpDoc.data()!;
    if (Date.now() > (otpData.expiresAt ?? 0)) {
      await otpDocRef.delete();
      return { status: "error", message: "OTP has expired. Please request a new code." };
    }

    const expectedHash = hashOtp(e164, otpCode, otpData.salt);
    const isMatch = timingSafeEqual(Buffer.from(expectedHash), Buffer.from(otpData.hashedCode));

    if (!isMatch) {
      return { status: "error", message: "Incorrect verification code." };
    }

    // Burn OTP immediately
    await otpDocRef.delete();
  }

  // 2. Resolve UID — check phoneAccounts collision path
  let uid: string;
  const phoneAccountDoc = await db.collection("phoneAccounts").doc(cleanDigits).get();

  if (phoneAccountDoc.exists && phoneAccountDoc.data()?.uid) {
    uid = phoneAccountDoc.data()!.uid;
  } else {
    // Check existing authProfiles
    const existingProfileSnap = await db
      .collection(collectionPaths.authProfiles)
      .where("phone", "in", [e164, cleanDigits, `+91 ${cleanDigits.slice(-10)}`])
      .limit(1)
      .get();

    if (!existingProfileSnap.empty) {
      uid = existingProfileSnap.docs[0].id;
    } else {
      uid = randomUUID();
    }
  }

  const personalGymId = `personal-${uid}`;
  const authEmail = `consumer-${uid.slice(0, 8)}@members.fitsplit.app`;

  // 3. Ensure Auth user exists
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { displayName: fullName });
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      await auth.createUser({
        uid,
        email: authEmail,
        displayName: fullName,
        emailVerified: false,
        disabled: false
      });
    } else {
      throw err;
    }
  }

  // 4. Provision personal workspace, affiliation, and profile atomically
  const batch = db.batch();

  // Index doc
  batch.set(
    db.collection("phoneAccounts").doc(cleanDigits),
    { uid, phone: e164, createdAt: now },
    { merge: true }
  );

  // Profile doc
  const profileRef = db.collection(collectionPaths.authProfiles).doc(uid);
  batch.set(
    profileRef,
    {
      id: uid,
      uid,
      fullName,
      phone: e164,
      authEmail,
      role: "member",
      plan: "free",
      defaultGymId: personalGymId,
      activeGymId: personalGymId,
      avatarInitials: profileInitials(fullName),
      termsAcceptedAt: now,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  // Personal Gym doc
  const gymRef = db.collection(collectionPaths.gyms).doc(personalGymId);
  batch.set(
    gymRef,
    {
      id: personalGymId,
      name: `${fullName}'s Workspace`,
      slug: `personal-${uid.slice(0, 8)}`,
      ownerName: fullName,
      ownerUserId: uid,
      ownerId: uid,
      type: "personal",
      status: "active",
      memberCount: 1,
      expiryWarningDays: 7,
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  // Member doc in Personal Gym
  const memberRef = gymRef.collection("members").doc(uid);
  batch.set(
    memberRef,
    {
      id: uid,
      gymId: personalGymId,
      fullName,
      phone: e164,
      role: "member",
      isActive: true,
      joinedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  // Affiliation doc
  const affiliationRef = profileRef.collection("affiliations").doc(personalGymId);
  batch.set(
    affiliationRef,
    {
      gymId: personalGymId,
      gymName: `${fullName}'s Workspace`,
      type: "personal",
      role: "member",
      memberId: uid,
      status: "active",
      joinedAt: now
    },
    { merge: true }
  );

  await batch.commit();

  // 5. Mint custom claims
  await auth.setCustomUserClaims(uid, {
    gymId: personalGymId,
    role: "member" as Role,
    memberId: uid,
    isActive: true,
    mustChangePassword: false
  });

  // 6. Create custom token and mint session cookie
  // We can exchange custom token for idToken via REST endpoint to create session cookie
  try {
    const customToken = await auth.createCustomToken(uid);
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

    if (apiKey) {
      const exchangeRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: customToken, returnSecureToken: true })
        }
      );

      if (exchangeRes.ok) {
        const { idToken } = await exchangeRes.json();
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_LONG_MS });

        const cookieStore = await cookies();
        const isProd = process.env.NODE_ENV === "production";

        cookieStore.set(sessionCookieName, sessionCookie, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: Math.floor(SESSION_LONG_MS / 1000)
        });

        cookieStore.set("fitsplit-role", "member", { path: "/" });
        cookieStore.set("fitsplit-username", fullName, { path: "/" });
        cookieStore.set("fitsplit-gym-id", personalGymId, { path: "/" });
        cookieStore.set("fitsplit-member-id", uid, { path: "/" });
      }
    }
  } catch (err) {
    console.error("[signUpConsumer] Session creation fallback:", err);
  }

  return {
    status: "success",
    message: "Your personal workspace is ready!"
  };
}
