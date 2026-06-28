import type { GymWorkspace, Member } from "@/types/domain";

import {
  gyms as mockGyms
} from "@/lib/mock-data";
import { collectionPaths, PRIMARY_GYM_ID, PRIMARY_OWNER_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import {
  gymCollection,
  mapProfileToMember,
  mapWorkspace
} from "./shared";
import { getActiveProgramAssignments } from "./programs";
import { getMembersUncached } from "./members";
import { getWorkoutProgramsUncached } from "./programs";
import { getExerciseCatalogUncached } from "./exercises";

export async function getGymWorkspaces(): Promise<{
  gyms: GymWorkspace[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { gyms: mockGyms, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const gymSnapshot = await db.collection(collectionPaths.gyms).get();

    if (gymSnapshot.empty) {
      return { gyms: mockGyms, isPersisted: false };
    }

    const gyms = gymSnapshot.docs.map((doc) => mapWorkspace(doc.id, doc.data()));

    if (gyms.length === 0) {
      return { gyms: mockGyms, isPersisted: false };
    }

    return { gyms, isPersisted: true };
  } catch {
    return { gyms: mockGyms, isPersisted: false };
  }
}

export async function getPrimaryWorkspace(): Promise<{
  gym: GymWorkspace;
  isPersisted: boolean;
}> {
  const { gyms, isPersisted } = await getGymWorkspaces();
  return {
    gym: gyms.find((workspace) => workspace.slug === PRIMARY_GYM_ID || workspace.id === PRIMARY_GYM_ID) ?? gyms[0],
    isPersisted
  };
}

export async function getGymDetail(gymId: string): Promise<{
  gym: GymWorkspace | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    const gym = mockGyms.find(g => g.id === gymId || g.slug === gymId) ?? null;
    return { gym, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const doc = await db.collection(collectionPaths.gyms).doc(gymId).get();

    if (!doc.exists) {
      // Try by slug
      const slugQuery = await db.collection(collectionPaths.gyms).where("slug", "==", gymId).limit(1).get();
      if (slugQuery.empty) return { gym: null, isPersisted: true };
      const slugDoc = slugQuery.docs[0];
      if (!slugDoc) return { gym: null, isPersisted: true };
      return { gym: mapWorkspace(slugDoc.id, slugDoc.data()), isPersisted: true };
    }

    return { gym: mapWorkspace(doc.id, doc.data() ?? {}), isPersisted: true };
  } catch {
    return { gym: null, isPersisted: false };
  }
}

export async function getOwnersForGym(gymId: string): Promise<{
  owners: Member[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    if (gymId !== PRIMARY_GYM_ID) {
      return { owners: [], isPersisted: false };
    }

    return {
      owners: [
        {
          id: PRIMARY_OWNER_ID,
          fullName: "Santosh SHG",
          email: "santosh-shg@fitsplit.app",
          phone: "",
          joinedAt: "2026-05-01",
          avatarInitials: "SO",
          goal: "owner",
          staffType: "owner",
          isActive: true
        },
        {
          id: "shg-trainer-1",
          fullName: "Ravi Kumar",
          email: "shg-trainer-1@fitsplit.app",
          phone: "",
          joinedAt: "2026-05-01",
          avatarInitials: "RK",
          goal: "trainer",
          staffType: "trainer",
          isActive: true
        },
        {
          id: "shg-trainer-2",
          fullName: "Priya Nair",
          email: "shg-trainer-2@fitsplit.app",
          phone: "",
          joinedAt: "2026-05-01",
          avatarInitials: "PN",
          goal: "trainer",
          staffType: "trainer",
          isActive: true
        }
      ],
      isPersisted: false
    };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await gymCollection(db, gymId, "staff")
      .where("role", "==", "owner")
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.authProfiles)
          .where("defaultGymId", "==", gymId)
          .where("role", "==", "owner")
          .get()
      : scopedSnapshot;

    const owners: Member[] = snapshot.docs.map(doc => mapProfileToMember(doc.id, doc.data()));

    return { owners, isPersisted: true };
  } catch {
    return { owners: [], isPersisted: false };
  }
}

export async function getRoleSummary(): Promise<{
  adminName: string;
  ownerName: string;
  ownerAccess: string;
  isPersisted: boolean;
}> {
  const fallback = {
    adminName: "FitSplit Admin",
    ownerName: "Santosh SHG",
    ownerAccess: "Sri Shakthi Hanuman Gym"
  };

  if (!hasFirebaseAdminConfig()) {
    return { ...fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const [adminSnapshot, ownerDoc, gymDoc] = await Promise.all([
      db.collection(collectionPaths.authProfiles).where("role", "==", "admin").limit(1).get(),
      db.collection(collectionPaths.authProfiles).doc(PRIMARY_OWNER_ID).get(),
      db.collection(collectionPaths.gyms).doc(PRIMARY_GYM_ID).get()
    ]);
    return {
      adminName: String(adminSnapshot.docs[0]?.data().fullName ?? fallback.adminName),
      ownerName: String(ownerDoc.data()?.fullName ?? fallback.ownerName),
      ownerAccess: String(gymDoc.data()?.name ?? fallback.ownerAccess),
      isPersisted: true
    };
  } catch {
    return { ...fallback, isPersisted: false };
  }
}

export type SlotLoad = {
  slotId: "A" | "B" | "C" | "D";
  label: string;
  time: string;
  memberCount: number;
  exercises: { exerciseName: string; count: number }[];
};

export async function getGymFloorLoadMap(gymId: string): Promise<{
  slots: SlotLoad[];
}> {
  // 1. Fetch active assignments in gym
  const [
    { assignments },
    { members },
    { programs },
    { exercises }
  ] = await Promise.all([
    getActiveProgramAssignments(gymId),
    getMembersUncached(gymId),
    getWorkoutProgramsUncached(gymId),
    getExerciseCatalogUncached(gymId)
  ]);

  // 2. Fetch all profiles to find slots for members
  const memberSlots: Record<string, { primary: string; secondary: string }> = {};

  if (hasFirebaseAdminConfig()) {
    try {
      const { db } = getFirebaseAdminServices();
      // .select() limits the document payload to just the two slot fields —
      // avoids reading the full profile for every gym member (potentially hundreds).
      const snapshot = await db
        .collection(collectionPaths.authProfiles)
        .where("defaultGymId", "==", gymId)
        .select("primarySlot", "secondarySlot")
        .get();
      snapshot.forEach(doc => {
        const data = doc.data();
        memberSlots[doc.id] = {
          primary: String(data.primarySlot || "A"),
          secondary: String(data.secondarySlot || "D")
        };
      });
    } catch (e) {
      console.error("Failed to query profiles for floor load mapping", e);
    }
  }

  // Fallback slots from mock data or default
  members.forEach(member => {
    if (!memberSlots[member.id]) {
      const code = member.fullName.charCodeAt(0) % 4;
      const slotsList = ["A", "B", "C", "D"];
      memberSlots[member.id] = {
        primary: slotsList[code],
        secondary: slotsList[(code + 2) % 4]
      };
    }
  });

  // 3. Initialize aggregator structure
  const slotDetails = {
    A: { label: "Slot A", time: "6 AM - 10 AM", memberCount: 0, exercises: {} as Record<string, number> },
    B: { label: "Slot B", time: "10 AM - 12 PM", memberCount: 0, exercises: {} as Record<string, number> },
    C: { label: "Slot C", time: "4 PM - 6 PM", memberCount: 0, exercises: {} as Record<string, number> },
    D: { label: "Slot D", time: "6 PM - 9 PM", memberCount: 0, exercises: {} as Record<string, number> }
  };

  // 4. For each active program assignment, find what exercises they are doing and accumulate
  assignments.forEach(assignment => {
    const memberId = assignment.memberId;
    const programId = assignment.programId;
    const slots = memberSlots[memberId] || { primary: "A", secondary: "D" };

    const program = programs.find(p => p.id === programId);
    if (!program) return;

    // Increment member headcount in these slots
    if (slots.primary && slotDetails[slots.primary as keyof typeof slotDetails]) {
      slotDetails[slots.primary as keyof typeof slotDetails].memberCount += 1;
    }
    if (slots.secondary && slots.secondary !== slots.primary && slotDetails[slots.secondary as keyof typeof slotDetails]) {
      slotDetails[slots.secondary as keyof typeof slotDetails].memberCount += 1;
    }

    // Accumulate exercises across their program days into both preferred slots
    program.days.forEach(day => {
      day.exercises.forEach(we => {
        const ex = exercises.find(e => e.id === we.exerciseId);
        if (!ex?.name) return; // skip unresolvable exercise IDs (e.g. migration artifacts)
        const name = ex.name;

        // Increment count in slots
        [slots.primary, slots.secondary].forEach(slotId => {
          if (slotId && slotDetails[slotId as keyof typeof slotDetails]) {
            const slot = slotDetails[slotId as keyof typeof slotDetails];
            slot.exercises[name] = (slot.exercises[name] || 0) + 1;
          }
        });
      });
    });
  });

  // 5. Format into final list
  const slots: SlotLoad[] = (["A", "B", "C", "D"] as const).map(id => {
    const s = slotDetails[id];
    const exerciseList = Object.entries(s.exercises)
      .map(([exerciseName, count]) => ({ exerciseName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 congested exercises

    return {
      slotId: id,
      label: s.label,
      time: s.time,
      memberCount: s.memberCount,
      exercises: exerciseList
    };
  });

  return { slots };
}
