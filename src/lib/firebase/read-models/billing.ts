import { unstable_cache } from "next/cache";
import type { Package, PaymentRequest, Membership, SubscriptionEvent } from "@/types/domain";
import { collectionPaths, gymCollectionPath } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymTag } from "./shared";

function mapPackage(docId: string, data: Record<string, unknown>): Package {
  return {
    id: docId,
    gymId: String(data.gymId ?? ""),
    name: String(data.name ?? ""),
    description: data.description ? String(data.description) : undefined,
    durationMonths: Number(data.durationMonths ?? 1),
    price: Number(data.price ?? 0),
    currency: String(data.currency ?? "INR"),
    includesPT: data.includesPT === true,
    ptSessionsIncluded: data.ptSessionsIncluded ? Number(data.ptSessionsIncluded) : undefined,
    isActive: data.isActive !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

function mapPaymentRequest(docId: string, data: Record<string, unknown>): PaymentRequest {
  return {
    id: docId,
    gymId: String(data.gymId ?? ""),
    memberId: String(data.memberId ?? ""),
    memberName: data.memberName ? String(data.memberName) : undefined,
    packageId: String(data.packageId ?? ""),
    packageName: data.packageName ? String(data.packageName) : undefined,
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "INR"),
    method: (["cash", "card", "upi", "other"].includes(String(data.method ?? "")) ?
      data.method : "cash") as PaymentRequest["method"],
    status: (["pending", "approved", "rejected", "cancelled"].includes(String(data.status ?? "")) ?
      data.status : "pending") as PaymentRequest["status"],
    requestedAt: String(data.requestedAt ?? ""),
    resolvedAt: data.resolvedAt ? String(data.resolvedAt) : undefined,
    resolvedByName: data.resolvedByName ? String(data.resolvedByName) : undefined,
    membershipId: data.membershipId ? String(data.membershipId) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
  };
}

function mapMembership(docId: string, data: Record<string, unknown>): Membership {
  return {
    id: docId,
    gymId: data.gymId ? String(data.gymId) : undefined,
    memberId: String(data.memberId ?? ""),
    packageId: data.packageId ? String(data.packageId) : undefined,
    planName: String(data.planName ?? ""),
    startDate: String(data.startDate ?? ""),
    endDate: String(data.endDate ?? ""),
    durationMonths: Number(data.durationMonths ?? 1),
    status: (["active", "expired", "cancelled"].includes(String(data.status ?? "")) ?
      data.status : undefined) as Membership["status"],
    paymentReference: data.paymentReference ? String(data.paymentReference) : undefined,
    paymentRequestId: data.paymentRequestId ? String(data.paymentRequestId) : undefined,
    activatedAt: data.activatedAt ? String(data.activatedAt) : undefined,
    renewedAt: data.renewedAt ? String(data.renewedAt) : undefined,
    cancelledAt: data.cancelledAt ? String(data.cancelledAt) : undefined,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
  };
}

// ── Packages ──────────────────────────────────────────────────────────────────

async function getPackagesUncached(gymId: string): Promise<Package[]> {
  if (!hasFirebaseAdminConfig()) return [];
  const { db } = getFirebaseAdminServices();
  const snap = await db.collection(gymCollectionPath(gymId, "packages")).get();
  return snap.docs.map((d) => mapPackage(d.id, d.data() as Record<string, unknown>));
}

export const getPackages = (gymId: string) =>
  unstable_cache(
    () => getPackagesUncached(gymId),
    ["read:getPackages", gymId],
    { tags: [gymTag(gymId, "packages")], revalidate: 60 }
  )();

// ── Payment requests ──────────────────────────────────────────────────────────

async function getPaymentRequestsUncached(gymId: string, status?: PaymentRequest["status"]): Promise<PaymentRequest[]> {
  if (!hasFirebaseAdminConfig()) return [];
  const { db } = getFirebaseAdminServices();
  const collection = db.collection(gymCollectionPath(gymId, "paymentRequests"));
  const snap = status
    ? await collection.where("status", "==", status).limit(100).get()
    : await collection.orderBy("requestedAt", "desc").limit(100).get();
  return snap.docs
    .map((d) => mapPaymentRequest(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export const getPaymentRequests = (gymId: string, status?: PaymentRequest["status"]) =>
  unstable_cache(
    () => getPaymentRequestsUncached(gymId, status),
    ["read:getPaymentRequests", gymId, status ?? "all"],
    { tags: [gymTag(gymId, "paymentRequests")], revalidate: 30 }
  )();

export const getPendingPaymentRequests = (gymId: string) => getPaymentRequests(gymId, "pending");

async function getPaymentRequestsForMemberUncached(gymId: string, memberId: string): Promise<PaymentRequest[]> {
  if (!hasFirebaseAdminConfig()) return [];
  const { db } = getFirebaseAdminServices();
  const snap = await db.collection(gymCollectionPath(gymId, "paymentRequests"))
    .where("memberId", "==", memberId)
    .limit(50)
    .get();
  return snap.docs
    .map((d) => mapPaymentRequest(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .slice(0, 20);
}

export const getPaymentRequestsForMember = (gymId: string, memberId: string) =>
  unstable_cache(
    () => getPaymentRequestsForMemberUncached(gymId, memberId),
    ["read:getPaymentRequestsForMember", gymId, memberId],
    { tags: [gymTag(gymId, "paymentRequests")], revalidate: 30 }
  )();

// ── Memberships ───────────────────────────────────────────────────────────────

async function getMembershipsForMemberUncached(gymId: string, memberId: string): Promise<Membership[]> {
  if (!hasFirebaseAdminConfig()) return [];
  const { db } = getFirebaseAdminServices();
  const snap = await db.collection(gymCollectionPath(gymId, "memberships"))
    .where("memberId", "==", memberId)
    .limit(50)
    .get();
  return snap.docs
    .map((d) => mapMembership(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => String(b.createdAt ?? b.startDate).localeCompare(String(a.createdAt ?? a.startDate)))
    .slice(0, 20);
}

export const getMembershipsForMember = (gymId: string, memberId: string) =>
  unstable_cache(
    () => getMembershipsForMemberUncached(gymId, memberId),
    ["read:getMembershipsForMember", gymId, memberId],
    { tags: [gymTag(gymId, "memberships")], revalidate: 60 }
  )();

// ── Consumer subscription events ────────────────────────────────────────────
// No caching here (unlike the gym-scoped reads above): this list is read
// right after a member submits an upgrade request and must reflect that
// write immediately, and it's a small per-user collection.

function mapSubscriptionEvent(docId: string, data: Record<string, unknown>): SubscriptionEvent {
  return {
    id: String(data.id ?? docId),
    uid: String(data.uid ?? ""),
    type: (["upgrade_requested", "upgrade_stubbed", "cancelled"].includes(String(data.type ?? ""))
      ? data.type
      : "upgrade_stubbed") as SubscriptionEvent["type"],
    plan: (data.plan === "pro" ? "pro" : "free") as SubscriptionEvent["plan"],
    createdAt: String(data.createdAt ?? ""),
    notes: data.notes ? String(data.notes) : undefined,
  };
}

export async function getSubscriptionEventsForUser(uid: string): Promise<SubscriptionEvent[]> {
  if (!hasFirebaseAdminConfig()) return [];
  const { db } = getFirebaseAdminServices();
  const snap = await db
    .collection(collectionPaths.authProfiles)
    .doc(uid)
    .collection("subscriptionEvents")
    .limit(50)
    .get();
  return snap.docs
    .map((d) => mapSubscriptionEvent(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Dashboard summary ─────────────────────────────────────────────────────────
