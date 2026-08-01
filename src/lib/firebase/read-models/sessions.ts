import type { AttendanceRecord, WorkoutSession } from "@/types/domain";

import { attendanceRecords as mockAttendanceRecords } from "@/lib/mock-data";
import { gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection, reportReadModelError } from "./shared";

export async function getActiveWorkoutSessions(gymId?: string): Promise<{
  sessions: WorkoutSession[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  if (!hasFirebaseAdminConfig()) {
    return { sessions: [], isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await gymCollection(db, targetGymId, "workoutSessions")
      .where("status", "==", "active")
      .get();
    const sessions: WorkoutSession[] = scopedSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? ""),
        gymId: data.gymId ? String(data.gymId) : undefined,
        startedAt: String(data.startedAt ?? new Date().toISOString()),
        endedAt: data.endedAt ? String(data.endedAt) : undefined,
        status: "active"
      };
    });

    return { sessions, isPersisted: true };
  } catch (error) {
    reportReadModelError("getActiveWorkoutSessions", error, { gymId: targetGymId });
    return { sessions: [], isPersisted: false };
  }
}

export type DailySessionCount = { date: string; sessions: number };

/**
 * C10: Returns day-by-day completed workout session counts for the last
 * `days` calendar days (default 30) for use in the owner dashboard
 * attendance trend LineChart.
 */
export async function getRecentSessionCounts(
  gymId?: string,
  days = 30
): Promise<DailySessionCount[]> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  // Build the ordered label array so days with zero sessions still appear.
  const now = new Date();
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(d.toISOString().slice(0, 10)); // "YYYY-MM-DD"
  }
  const countMap = new Map<string, number>(labels.map((l) => [l, 0]));

  if (!hasFirebaseAdminConfig()) {
    return labels.map((date) => ({ date, sessions: countMap.get(date) ?? 0 }));
  }

  try {
    const { db } = getFirebaseAdminServices();
    const since = new Date(now);
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const scopedSnapshot = await gymCollection(db, targetGymId, "workoutSessions")
      .where("status", "==", "completed")
      .where("startedAt", ">=", sinceIso)
      .get();
    for (const doc of scopedSnapshot.docs) {
      const startedAt = String(doc.data().startedAt ?? "");
      const dateKey = startedAt.slice(0, 10);
      if (countMap.has(dateKey)) {
        countMap.set(dateKey, (countMap.get(dateKey) ?? 0) + 1);
      }
    }
  } catch (error) {
    // Fail soft — return zero-filled array so the chart renders without breaking the page.
    reportReadModelError("getRecentSessionCounts", error, { gymId: targetGymId });
  }

  return labels.map((date) => ({ date, sessions: countMap.get(date) ?? 0 }));
}

export async function getAttendanceRecords(memberId: string, gymId?: string): Promise<{
  records: AttendanceRecord[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      records: mockAttendanceRecords.filter(r => r.memberId === memberId),
      isPersisted: false
    };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "attendanceRecords").where("memberId", "==", memberId).get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.attendanceRecords)
          .where("memberId", "==", memberId)
          .get();

    const records: AttendanceRecord[] = scopedSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId),
        gymId: data.gymId ? String(data.gymId) : undefined,
        sessionId: data.sessionId ? String(data.sessionId) : undefined,
        checkInAt: String(data.checkInAt),
        checkOutAt: data.checkOutAt ? String(data.checkOutAt) : undefined,
        latitude: data.latitude != null ? Number(data.latitude) : undefined,
        longitude: data.longitude != null ? Number(data.longitude) : undefined,
        deviceInfo: data.deviceInfo ? String(data.deviceInfo) : undefined,
        distanceMeters: data.distanceMeters != null ? Number(data.distanceMeters) : undefined,
        geofenceStatus: data.geofenceStatus
          ? String(data.geofenceStatus) as AttendanceRecord["geofenceStatus"]
          : undefined,
        radiusMeters: data.radiusMeters != null ? Number(data.radiusMeters) : undefined
      };
    });

    return { records, isPersisted: true };
  } catch (error) {
    reportReadModelError("getAttendanceRecords", error, { memberId, gymId });
    return {
      records: mockAttendanceRecords.filter(r => r.memberId === memberId),
      isPersisted: false
    };
  }
}
