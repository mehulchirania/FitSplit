import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LiftLog, DayLog, MealLog, GymNotice, SkipReason } from "@fitsplit/core";

export interface GymDetails {
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  locationUrl?: string;
  notices?: GymNotice[];
}

export interface MemberDetails {
  fullName: string;
  membershipStatus?: string;
  membershipEndDate?: string;
}

export async function getMemberDetails(gymId: string, memberId: string): Promise<MemberDetails | null> {
  const snapshot = await getDoc(doc(db, "gyms", gymId, "members", memberId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    fullName: String(data.fullName ?? ""),
    membershipStatus: data.membershipStatus ? String(data.membershipStatus) : undefined,
    membershipEndDate: data.membershipEndDate ? String(data.membershipEndDate) : undefined
  };
}

export async function getGymDetails(gymId: string): Promise<GymDetails | null> {
  const snapshot = await getDoc(doc(db, "gyms", gymId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    name: String(data.name ?? "Your Gym"),
    logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    email: data.email ? String(data.email) : undefined,
    locationUrl: data.locationUrl ? String(data.locationUrl) : undefined,
    notices: Array.isArray(data.notices) ? (data.notices as GymNotice[]) : []
  };
}

export async function getLiftLogs(gymId: string, memberId: string, limitCount = 100): Promise<LiftLog[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "gyms", gymId, "liftLogs"),
      where("memberId", "==", memberId),
      limit(limitCount)
    )
  );
  const logs: LiftLog[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    logs.push({
      id: docSnap.id,
      memberId: String(data.memberId ?? memberId),
      exerciseId: String(data.exerciseId ?? ""),
      sets: Number(data.sets ?? 0),
      reps: String(data.reps ?? "0"),
      weight: Number(data.weight ?? 0),
      sessionId: String(data.sessionId ?? ""),
      loggedAt: String(data.loggedAt ?? "")
    });
  });
  return logs.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export async function getDayLogs(gymId: string, memberId: string, limitCount = 100): Promise<DayLog[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "gyms", gymId, "dayLogs"),
      where("memberId", "==", memberId),
      limit(limitCount)
    )
  );
  const logs: DayLog[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    logs.push({
      id: docSnap.id,
      memberId: String(data.memberId ?? memberId),
      programId: String(data.programId ?? ""),
      dayId: String(data.dayId ?? ""),
      weekStart: String(data.weekStart ?? ""),
      status: String(data.status ?? "skipped") as DayLog["status"],
      skipReason: data.skipReason ? (String(data.skipReason) as SkipReason) : undefined,
      note: data.note ? String(data.note) : undefined,
      loggedAt: String(data.loggedAt ?? "")
    });
  });
  return logs.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export async function getMealLogs(gymId: string, memberId: string, date: string): Promise<MealLog[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "gyms", gymId, "mealLogs"),
      where("memberId", "==", memberId),
      where("date", "==", date)
    )
  );
  const logs: MealLog[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    logs.push({
      id: docSnap.id,
      memberId: String(data.memberId ?? memberId),
      gymId: String(data.gymId ?? gymId),
      date: String(data.date ?? date),
      name: String(data.name ?? ""),
      kcal: Number(data.kcal ?? 0),
      protein: Number(data.protein ?? 0),
      carbs: Number(data.carbs ?? 0),
      fat: Number(data.fat ?? 0),
      loggedAt: String(data.loggedAt ?? "")
    });
  });
  return logs.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}
