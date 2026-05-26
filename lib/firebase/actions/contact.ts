/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import {
  requireFirebase,
  requireText,
  assertValidEmail,
  assertValidPhone,
  getActionFormData,
  success,
  failure,
  mirrorGymScopedRecord
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";

const SubmitContactSchema = z.object({
  source: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  body: z.string().optional(),
}).superRefine((data, ctx) => {
  const isCompact = data.source === "footer-compact";
  const email = (data.email || "").trim();
  const name = (data.name || "").trim();
  const body = (data.body || "").trim();
  const mobile = (data.mobile || "").trim();

  if (isCompact) {
    if (!email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email is required.", path: ["email"] });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email is invalid.", path: ["email"] });
    }
  } else {
    if (!name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name is required.", path: ["name"] });
    }
    if (!mobile) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mobile number is required.", path: ["mobile"] });
    } else if (!/^(\+91)?[6-9]\d{9}$/.test(mobile.replace(/[\s-]/g, ""))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mobile number is invalid.", path: ["mobile"] });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Email is invalid.", path: ["email"] });
    }
  }

  if (body.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Message must be at least 10 characters.", path: ["body"] });
  }
});

const MarkContactReadSchema = z.object({
  messageId: ZodHelpers.textRequired("Message ID")
});

export async function submitContactMessage(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, SubmitContactSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const messageId = randomUUID();
    const notificationId = randomUUID();
    const now = new Date().toISOString();
    
    const { source, email = "", name: rawName = "", mobile: rawMobile = "", body: rawBody = "" } = parsed.data;
    const isCompactFooter = source === "footer-compact";
    const name = isCompactFooter ? email.trim() || "Website visitor" : rawName.trim();
    const mobile = isCompactFooter ? "" : rawMobile.trim();
    const body = rawBody.trim();

    const gymId = PRIMARY_GYM_ID;
    const contactRecord = {
      id: messageId,
      gymId,
      name,
      mobile,
      email,
      body,
      status: "unread",
      createdAt: now,
      updatedAt: now
    };
    await db.collection(collectionPaths.contactMessages).doc(messageId).set(contactRecord);
    await mirrorGymScopedRecord(db, gymId, "contactMessages", messageId, contactRecord);

    const notificationRecord = {
      id: notificationId,
      recipientRole: "admin",
      recipientId: "admin-fitsplit",
      type: "contact_message",
      title: "New landing page message",
      body: `${name} sent a contact request.`,
      contactMessageId: messageId,
      createdAt: now
    };
    await db.collection(collectionPaths.notifications).doc(notificationId).set(notificationRecord);
    await mirrorGymScopedRecord(db, gymId, "notifications", notificationId, notificationRecord);

    return success("Message sent. We will get back to you soon.", gymId, ["contact", "notifications"]);
  } catch (error) {
    console.error("Unable to submit contact message", error);
    return failure(error, "Unable to send message. Please try again.");
  }
}

export async function getUnreadMessageCount(): Promise<number> {
  if (!hasFirebaseAdminConfig()) {
    return 0;
  }

  try {
    const db = requireFirebase();
    const snapshot = await db
      .collection(collectionPaths.contactMessages)
      .where("status", "==", "unread")
      .get();

    return snapshot.size;
  } catch {
    return 0;
  }
}

export async function markContactMessageRead(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, MarkContactReadSchema);
    if (!parsed.success) return parsed.state;

    const messageId = parsed.data.messageId;
    const db = requireFirebase();
    const now = new Date().toISOString();

    await db.collection(collectionPaths.contactMessages).doc(messageId).set(
      {
        status: "read",
        updatedAt: now
      },
      { merge: true }
    );
    const scopedMessages = await db
      .collectionGroup("contactMessages")
      .where("id", "==", messageId)
      .get();
    await Promise.all(
      scopedMessages.docs.map((doc) =>
        doc.ref.set({ status: "read", updatedAt: now }, { merge: true })
      )
    );

    return success("Message marked as read.", undefined, ["contact", "notifications"]);
  } catch (error) {
    return failure(error, "Unable to update message.");
  }
}
