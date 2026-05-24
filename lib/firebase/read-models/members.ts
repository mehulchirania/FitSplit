import { unstable_cache } from "next/cache";
import type { Member, ProfileMetrics } from "@/types/domain";

import { members as mockMembers } from "@/lib/mock-data";
import { collectionPaths } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import {
  gymCollection,
  mapProfileToMember,
  getMemberProfileDocument,
  gymTag
} from "./shared";
import { PRIMARY_GYM_ID } from "../collections";

export async function getMembersUncached(gymId?: string): Promise<{
  members: Member[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;

  if (!hasFirebaseAdminConfig()) {
    return { members: mockMembers, isPersisted: false };
  }

  let profileSnapshot;
  let db;

  try {
    db = getFirebaseAdminServices().db;
    const scopedSnapshot = await gymCollection(db, targetGymId, "members").get();
    profileSnapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.authProfiles)
          .where("defaultGymId", "==", targetGymId)
          .where("role", "==", "member")
          .get()
      : scopedSnapshot;
  } catch {
    return { members: mockMembers, isPersisted: false };
  }

  if (profileSnapshot.empty) {
    return { members: [], isPersisted: true };
  }

  const members: Member[] = profileSnapshot.docs.map((doc) => mapProfileToMember(doc.id, doc.data()));

  return { members, isPersisted: true };
}

export async function getMembers(gymId?: string) {
  return unstable_cache(
    getMembersUncached,
    ["read:getMembers", gymId ?? "default"],
    { tags: ["members", "gym-data", gymTag(gymId)], revalidate: 60 }
  )(gymId);
}

export async function getMemberDetail(memberId: string): Promise<{
  member: Member | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    const member = mockMembers.find((item) => item.id === memberId) ?? null;
    return {
      member,
      isPersisted: false
    };
  }

  let db;
  let profileDoc;

  try {
    db = getFirebaseAdminServices().db;
    profileDoc = await getMemberProfileDocument(db, memberId);
  } catch {
    const member = mockMembers.find((item) => item.id === memberId) ?? null;
    return {
      member,
      isPersisted: false
    };
  }

  if (!profileDoc.exists) {
    const member = mockMembers.find((item) => item.id === memberId) ?? null;
    return {
      member,
      isPersisted: false
    };
  }

  const data = profileDoc.data() ?? {};

  if (data.role !== "member") {
    return { member: null, isPersisted: true };
  }

  const memberName = String(data.fullName ?? "");
  const username =
    String(data.username ?? "").trim() ||
    String(data.phone ?? "").trim() ||
    String(data.email ?? "").trim() ||
    undefined;
  const member: Member = {
    id: profileDoc.id,
    fullName: memberName,
    email: String(data.email),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? (memberName.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "MB")),
    goal: String(data.goal ?? "General fitness"),
    isActive: data.isActive !== false,
    username
  };

  return { member, isPersisted: true };
}

export async function getProfileMetrics(memberId: string): Promise<{
  profile: ProfileMetrics;
  isPersisted: boolean;
}> {
  const fallbackMember = mockMembers.find((member) => member.id === memberId) ?? mockMembers[0];
  const fallback: ProfileMetrics = {
    fullName: fallbackMember.fullName,
    email: fallbackMember.email,
    phone: fallbackMember.phone,
    age: 29,
    gender: "",
    dob: "",
    heightCm: 174,
    weightKg: 72,
    fitnessGoals: fallbackMember.goal,
    medicalNotes: "",
    primarySlot: "A",
    secondarySlot: "D",
    injuryNotes: "",
    assignedTrainer: ""
  };

  if (!hasFirebaseAdminConfig()) {
    return { profile: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const doc = await getMemberProfileDocument(db, memberId);

    if (!doc.exists) {
      return { profile: fallback, isPersisted: !hasFirebaseAdminConfig() };
    }

    const data = doc.data() ?? {};
    return {
      profile: {
        fullName: String(data.fullName ?? fallback.fullName),
        email: String(data.email ?? fallback.email),
        phone: String(data.phone ?? fallback.phone),
        age: data.age ? Number(data.age) : fallback.age,
        gender: String(data.gender ?? fallback.gender ?? ""),
        dob: String(data.dob ?? fallback.dob ?? ""),
        heightCm: data.heightCm ? Number(data.heightCm) : fallback.heightCm,
        weightKg: data.weightKg ? Number(data.weightKg) : fallback.weightKg,
        fitnessGoals: String(data.fitnessGoals ?? data.goal ?? fallback.fitnessGoals ?? ""),
        medicalNotes: String(data.medicalNotes ?? fallback.medicalNotes ?? ""),
        primarySlot: String(data.primarySlot ?? fallback.primarySlot ?? "A") as ProfileMetrics["primarySlot"],
        secondarySlot: String(data.secondarySlot ?? fallback.secondarySlot ?? "D") as ProfileMetrics["secondarySlot"],
        injuryNotes: String(data.injuryNotes ?? fallback.injuryNotes ?? ""),
        assignedTrainer: String(data.assignedTrainer ?? fallback.assignedTrainer ?? ""),
        coachNote: data.coachNote ? String(data.coachNote) : undefined,
        coachNoteUpdatedAt: data.coachNoteUpdatedAt ? String(data.coachNoteUpdatedAt) : undefined,
        coachNoteUpdatedByName: data.coachNoteUpdatedByName ? String(data.coachNoteUpdatedByName) : undefined
      },
      isPersisted: true
    };
  } catch {
    return { profile: fallback, isPersisted: false };
  }
}

export async function getMemberWithProfile(memberId: string): Promise<{
  member: Member | null;
  profile: ProfileMetrics;
  isPersisted: boolean;
}> {
  const fallbackMember = mockMembers.find((m) => m.id === memberId) ?? mockMembers[0];
  const fallbackProfile: ProfileMetrics = {
    fullName: fallbackMember.fullName,
    email: fallbackMember.email,
    phone: fallbackMember.phone,
    age: 29,
    gender: "",
    dob: "",
    heightCm: 174,
    weightKg: 72,
    fitnessGoals: fallbackMember.goal,
    medicalNotes: "",
    primarySlot: "A",
    secondarySlot: "D",
    injuryNotes: "",
    assignedTrainer: ""
  };

  if (!hasFirebaseAdminConfig()) {
    return {
      member: fallbackMember,
      profile: fallbackProfile,
      isPersisted: false
    };
  }

  let doc;
  try {
    const { db } = getFirebaseAdminServices();
    doc = await getMemberProfileDocument(db, memberId);
  } catch {
    return { member: fallbackMember, profile: fallbackProfile, isPersisted: false };
  }

  if (!doc.exists) {
    return { member: fallbackMember, profile: fallbackProfile, isPersisted: false };
  }

  const data = doc.data() ?? {};

  if (data.role !== "member") {
    return { member: null, profile: fallbackProfile, isPersisted: true };
  }

  const member: Member = {
    id: doc.id,
    fullName: String(data.fullName),
    email: String(data.email),
    phone: String(data.phone ?? ""),
    joinedAt: String(data.joinedAt ?? data.createdAt ?? new Date().toISOString().slice(0, 10)),
    avatarInitials: String(data.avatarInitials ?? "MB"),
    goal: String(data.goal ?? ""),
    isActive: data.isActive !== false
  };

  const profile: ProfileMetrics = {
    fullName: String(data.fullName ?? fallbackProfile.fullName),
    email: String(data.email ?? fallbackProfile.email),
    phone: String(data.phone ?? fallbackProfile.phone),
    age: data.age ? Number(data.age) : fallbackProfile.age,
    gender: String(data.gender ?? fallbackProfile.gender ?? ""),
    dob: String(data.dob ?? fallbackProfile.dob ?? ""),
    heightCm: data.heightCm ? Number(data.heightCm) : fallbackProfile.heightCm,
    weightKg: data.weightKg ? Number(data.weightKg) : fallbackProfile.weightKg,
    fitnessGoals: String(data.fitnessGoals ?? data.goal ?? fallbackProfile.fitnessGoals ?? ""),
    medicalNotes: String(data.medicalNotes ?? fallbackProfile.medicalNotes ?? ""),
    primarySlot: String(data.primarySlot ?? fallbackProfile.primarySlot ?? "A") as ProfileMetrics["primarySlot"],
    secondarySlot: String(data.secondarySlot ?? fallbackProfile.secondarySlot ?? "D") as ProfileMetrics["secondarySlot"],
    injuryNotes: String(data.injuryNotes ?? fallbackProfile.injuryNotes ?? ""),
    assignedTrainer: String(data.assignedTrainer ?? fallbackProfile.assignedTrainer ?? ""),
    coachNote: data.coachNote ? String(data.coachNote) : undefined,
    coachNoteUpdatedAt: data.coachNoteUpdatedAt ? String(data.coachNoteUpdatedAt) : undefined,
    coachNoteUpdatedByName: data.coachNoteUpdatedByName ? String(data.coachNoteUpdatedByName) : undefined
  };

  return { member, profile, isPersisted: true };
}

export async function getTrainersForGymUncached(gymId: string): Promise<Member[]> {
  const { db } = getFirebaseAdminServices();
  const scopedSnap = await gymCollection(db, gymId, "staff")
    .where("role", "==", "owner")
    .get();
  const rootSnap = scopedSnap.empty
    ? await db
        .collection(collectionPaths.authProfiles)
        .where("defaultGymId", "==", gymId)
        .where("role", "==", "owner")
        .get()
    : null;

  const docs = scopedSnap.empty && rootSnap ? rootSnap.docs : scopedSnap.docs;
  return docs
    .map((d) => mapProfileToMember(d.id, d.data() as Record<string, unknown>))
    .filter((staff) => staff.isActive !== false && staff.staffType !== "staff")
    .sort((a, b) => {
      if (a.staffType !== b.staffType) return a.staffType === "owner" ? -1 : 1;
      return a.fullName.localeCompare(b.fullName);
    });
}

export async function getTrainersForGym(gymId: string): Promise<Member[]> {
  return unstable_cache(
    getTrainersForGymUncached,
    ["read:getTrainersForGym", gymId],
    { tags: ["staff", gymTag(gymId)], revalidate: 60 }
  )(gymId);
}
