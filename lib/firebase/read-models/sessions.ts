import type { AttendanceRecord, WorkoutSession } from "@/types/domain";

import { attendanceRecords as mockAttendanceRecords } from "@/lib/mock-data";
import { collectionPaths, gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection } from "./shared";

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
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.workoutSessions)
          .where("gymId", "==", targetGymId)
          .where("status", "==", "active")
          .get()
      : scopedSnapshot;
    const sessions: WorkoutSession[] = snapshot.docs.map((doc) => {
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
  } catch {
    return { sessions: [], isPersisted: false };
  }
}

export async function getAttendanceRecords(memberId: string): Promise<{
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
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.attendanceRecords)
      .where("memberId", "==", memberId)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.attendanceRecords)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;

    const records: AttendanceRecord[] = snapshot.docs.map(doc => {
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
  } catch {
    return {
      records: mockAttendanceRecords.filter(r => r.memberId === memberId),
      isPersisted: false
    };
  }
}
