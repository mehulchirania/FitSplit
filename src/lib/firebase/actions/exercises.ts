/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { randomUUID } from "crypto";
import { requireOwner, requireRole } from "@/lib/auth";
import { collectionPaths, PRIMARY_GYM_ID } from "../collections";
import { hasFirebaseAdminConfig } from "../admin";
import type { FormActionState } from "@/types/action-state";
import workoutsData from "@/lib/workouts.json";
import {
  requireFirebase,
  requireText,
  getActionFormData,
  success,
  failure,
  scopedGymDoc,
  mirrorGymScopedRecord
} from "./shared";
import { z } from "zod";
import { parseActionData, ZodHelpers } from "./validation";
import { ensurePrimaryWorkspace } from "./gyms";

const RequestCatalogSchema = z.object({
  name: ZodHelpers.textRequired("Exercise name"),
  muscleGroup: ZodHelpers.textRequired("Muscle group"),
  equipment: z.string().optional(),
  instructions: z.string().optional()
});

export async function requestCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, RequestCatalogSchema);
    if (!parsed.success) return parsed.state;

    const { name, muscleGroup, equipment = "", instructions = "" } = parsed.data;

    if (!hasFirebaseAdminConfig()) {
      return success(`"${name}" request noted. Connect Firebase to save requests for admin review.`, undefined, ["exercises"]);
    }

    const db = requireFirebase();
    const requestId = randomUUID();
    const notificationId = randomUUID();
    const now = new Date().toISOString();

    // Get gym name for the notification body
    const gymDoc = await db.collection(collectionPaths.gyms).doc(currentUser.gymId ?? PRIMARY_GYM_ID).get();
    const gymName = String(gymDoc.data()?.name ?? currentUser.gymId ?? "A gym");

    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const requestRecord = {
      id: requestId,
      gymId,
      gymName,
      requestedBy: currentUser.uid,
      name,
      muscleGroup,
      equipment: equipment.trim(),
      instructions: instructions.trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    await db.collection(collectionPaths.exerciseRequests).doc(requestId).set(requestRecord);
    await mirrorGymScopedRecord(db, gymId, "exerciseRequests", requestId, requestRecord);

    const notificationRecord = {
      id: notificationId,
      recipientRole: "admin",
      recipientId: "admin-fitsplit",
      type: "exercise_request",
      title: "New exercise catalog request",
      body: `${gymName} wants to add "${name}" (${muscleGroup}) to the catalog.`,
      exerciseRequestId: requestId,
      actionHref: "/owner/exercises",
      createdAt: now
    };
    await db.collection(collectionPaths.notifications).doc(notificationId).set(notificationRecord);
    await mirrorGymScopedRecord(db, gymId, "notifications", notificationId, notificationRecord);

    return success(`Request to add "${name}" sent to admin for review.`, gymId, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to send exercise request.");
  }
}

const ApproveRequestSchema = z.object({
  requestId: ZodHelpers.textRequired("Request ID"),
  name: z.string().optional(),
  muscleGroup: z.string().optional(),
  equipment: z.string().optional(),
  instructions: z.string().optional()
});

export async function approveCatalogExerciseRequest(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ApproveRequestSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const { requestId, name: rawName, muscleGroup: rawGroup, equipment: rawEq, instructions: rawInst } = parsed.data;
    const now = new Date().toISOString();

    let requestDoc = await db.collection(collectionPaths.exerciseRequests).doc(requestId).get();
    if (!requestDoc.exists) {
      const scopedRequest = await db
        .collectionGroup("exerciseRequests")
        .where("id", "==", requestId)
        .limit(1)
        .get();
      requestDoc = scopedRequest.docs[0] ?? requestDoc;
    }
    if (!requestDoc.exists) throw new Error("Exercise request not found.");

    const data = requestDoc.data()!;
    const name = String(rawName ?? data.name ?? "");
    const muscleGroup = String(rawGroup ?? data.muscleGroup ?? "");
    const equipment = String(rawEq ?? data.equipment ?? "");
    const instructions = String(rawInst ?? data.instructions ?? "");
    const gymId = String(data.gymId ?? PRIMARY_GYM_ID);

    if (!name || !muscleGroup) throw new Error("Name and muscle group are required.");

    const exerciseId = randomUUID();
    const exerciseRecord = {
      id: exerciseId,
      gymId,
      name,
      muscleGroup,
      equipment: equipment.trim(),
      instructions: instructions.trim(),
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: "",
      ownerOnly: true,
      isActive: true,
      createdBy: "admin-fitsplit",
      approvedFromRequestId: requestId,
      createdAt: now,
      updatedAt: now
    };
    await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set(exerciseRecord);
    await mirrorGymScopedRecord(db, gymId, "exerciseCatalog", exerciseId, exerciseRecord);

    await db.collection(collectionPaths.exerciseRequests).doc(requestId).set(
      { status: "approved", approvedAt: now, updatedAt: now },
      { merge: true }
    );
    await requestDoc.ref.set(
      { status: "approved", approvedAt: now, updatedAt: now },
      { merge: true }
    );
    await scopedGymDoc(db, gymId, "exerciseRequests", requestId).set(
      { status: "approved", approvedAt: now, updatedAt: now },
      { merge: true }
    );

    return success(`"${name}" added to the exercise catalog.`, gymId, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to approve exercise request.");
  }
}

const RequestIdSchema = z.object({
  requestId: ZodHelpers.textRequired("Request ID")
});

export async function rejectCatalogExerciseRequest(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    await requireRole(["admin"]);
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, RequestIdSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const requestId = parsed.data.requestId;
    const now = new Date().toISOString();

    await db.collection(collectionPaths.exerciseRequests).doc(requestId).set(
      { status: "rejected", rejectedAt: now, updatedAt: now },
      { merge: true }
    );
    const scopedRequests = await db
      .collectionGroup("exerciseRequests")
      .where("id", "==", requestId)
      .get();
    await Promise.all(
      scopedRequests.docs.map((doc) =>
        doc.ref.set({ status: "rejected", rejectedAt: now, updatedAt: now }, { merge: true })
      )
    );

    return success("Exercise request dismissed.", undefined, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to dismiss request.");
  }
}

const CreateCatalogSchema = z.object({
  name: ZodHelpers.textRequired("Exercise name"),
  muscleGroup: ZodHelpers.textRequired("Muscle group"),
  targetGymId: z.string().optional(),
  equipment: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().optional(),
  videoSource: z.string().optional(),
  gymVideoUrl: z.string().optional(),
  gymVideoSource: z.string().optional()
});

export async function createCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, CreateCatalogSchema);
    if (!parsed.success) return parsed.state;

    await ensurePrimaryWorkspace();
    const db = requireFirebase();
    const exerciseId = randomUUID();
    const now = new Date().toISOString();
    
    const {
      name, muscleGroup, targetGymId: rawTargetGym = "",
      equipment = "", instructions = "",
      videoUrl = "", videoSource = "youtube",
      gymVideoUrl = "", gymVideoSource = "youtube"
    } = parsed.data;

    const isAdmin = currentUser.role === "admin";
    const targetGymId = rawTargetGym.trim();
    const gymId = currentUser.role === "admin"
      ? (targetGymId || currentUser.gymId || PRIMARY_GYM_ID)
      : (currentUser.gymId ?? PRIMARY_GYM_ID);
    const exerciseRecord = {
      id: exerciseId,
      gymId: isAdmin && !targetGymId ? "global" : gymId,
      scope: isAdmin && !targetGymId ? "default" : "custom",
      name,
      muscleGroup,
      equipment: equipment.trim(),
      instructions: instructions.trim(),
      videoSource: isAdmin && !targetGymId && videoUrl.trim() ? videoSource : "none",
      videoUrl: isAdmin && !targetGymId ? videoUrl.trim() : "",
      gymVideoUrl: isAdmin && !targetGymId ? "" : gymVideoUrl.trim(),
      gymVideoSource: (targetGymId || !isAdmin) && gymVideoUrl.trim() ? gymVideoSource : "none",
      ownerOnly: true,
      isActive: true,
      createdBy: currentUser.uid,
      createdAt: now,
      updatedAt: now
    };
    if (isAdmin && !targetGymId) {
      await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set(exerciseRecord);
    } else {
      await scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId).set(exerciseRecord);
    }

    return success(`${name} was added to the exercise catalog.`, gymId, ["exercises"]);
  } catch (error) {
    console.error("Unable to create catalog exercise", error);
    return failure(error, "Unable to save exercise. Please try again.");
  }
}

const UpdateCatalogSchema = z.object({
  exerciseId: ZodHelpers.textRequired("Exercise ID"),
  name: ZodHelpers.textRequired("Exercise name"),
  muscleGroup: ZodHelpers.textRequired("Muscle group"),
  equipment: z.string().optional(),
  instructions: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  videoSource: z.string().optional(),
  gymVideoUrl: z.string().optional(),
  gymVideoSource: z.string().optional()
});

export async function updateCatalogExercise(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, UpdateCatalogSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const {
      exerciseId, name, muscleGroup, equipment = "", instructions = "", thumbnailUrl = "",
      videoUrl: rawVideo = "", videoSource = "youtube",
      gymVideoUrl: rawGymVideo = "", gymVideoSource = "youtube"
    } = parsed.data;

    const now = new Date().toISOString();
    const videoUrl = rawVideo.trim();
    const gymVideoUrl = rawGymVideo.trim();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const rootDoc = await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).get();
    const scopedDoc = await scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId).get();
    const isAdmin = currentUser.role === "admin";

    if (!isAdmin && rootDoc.exists && !scopedDoc.exists) {
      throw new Error("Default exercises can only be edited by an admin. Add a custom exercise for this gym instead.");
    }

    const updatePayload: Record<string, unknown> = {
        id: exerciseId,
        gymId: isAdmin && rootDoc.exists ? "global" : gymId,
        scope: isAdmin && rootDoc.exists ? "default" : "custom",
        name,
        muscleGroup,
        equipment: equipment.trim(),
        instructions: instructions.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        videoSource: isAdmin && videoUrl ? videoSource : "none",
        videoUrl: isAdmin ? videoUrl : "",
        gymVideoUrl: isAdmin && rootDoc.exists ? "" : gymVideoUrl,
        gymVideoSource: !isAdmin && gymVideoUrl ? gymVideoSource : "none",
        ownerOnly: true,
        isActive: true,
        updatedBy: currentUser.uid,
        updatedAt: now
      };

    if (isAdmin && rootDoc.exists) {
      await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).set(updatePayload, { merge: true });
    } else {
      await scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId).set(updatePayload, { merge: true });
    }

    return success(`${name} updated.`, gymId, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to update exercise.");
  }
}

// ── Set gym exercise video (owner-only, predefined exercises) ─────────────────

const SetGymExerciseVideoSchema = z.object({
  exerciseId: ZodHelpers.textRequired("Exercise ID"),
  gymVideoUrl: z.string().optional(),
});

export async function setGymExerciseVideo(
  previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const parsed = parseActionData(formData, SetGymExerciseVideoSchema);
    if (!parsed.success) return parsed.state;

    const { exerciseId, gymVideoUrl = "" } = parsed.data;
    const trimmedUrl = gymVideoUrl.trim();

    const db = requireFirebase();
    await scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId).set(
      {
        gymVideoUrl: trimmedUrl,
        gymVideoSource: trimmedUrl ? "youtube" : "none",
        updatedBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return success("Gym video updated.", gymId, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to update gym video.");
  }
}

// ── Reset exercise videos ─────────────────────────────────────────────────────

const ResetVideosSchema = z.object({
  exerciseId: ZodHelpers.textRequired("Exercise ID"),
  exerciseName: z.string().optional()
});

export async function resetExerciseVideos(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, ResetVideosSchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const { exerciseId, exerciseName: rawName = "" } = parsed.data;
    const exerciseName = rawName.trim().toLowerCase();

    // Look up defaults from the seeded workouts catalog
    type CatalogEntry = { name: string; video_url?: string; gym_video_url?: string };
    const catalog = (workoutsData as { exercise_catalog: Record<string, CatalogEntry[]> }).exercise_catalog;

    let defaultVideoUrl = "";
    let defaultGymVideoUrl = "";

    for (const entries of Object.values(catalog)) {
      const match = entries.find((e) => e.name.toLowerCase() === exerciseName);
      if (match) {
        defaultVideoUrl = match.video_url ?? "";
        defaultGymVideoUrl = match.gym_video_url ?? "";
        break;
      }
    }

    const now = new Date().toISOString();
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const rootDoc = await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).get();
    if (currentUser.role === "admin" && rootDoc.exists) {
      await db.collection(collectionPaths.exerciseCatalog).doc(exerciseId).update({
        videoUrl: defaultVideoUrl,
        videoSource: defaultVideoUrl ? "youtube" : "none",
        gymVideoUrl: "",
        gymVideoSource: "none",
        scope: "default",
        gymId: "global",
        updatedAt: now,
      });
    } else {
      await scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId).set({
        gymVideoUrl: defaultGymVideoUrl,
        gymVideoSource: defaultGymVideoUrl ? "youtube" : "none",
        updatedAt: now,
      }, { merge: true });
    }

    return success("Videos reset to default.", gymId, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to reset videos.");
  }
}

/**
 * Toggle the DeltaBolic/TylerPath tutorial visibility for a single exercise.
 * Owner-only — updates (or creates) the gym-scoped exerciseCatalog doc.
 */
const TutorialVisibilitySchema = z.object({
  exerciseId: ZodHelpers.textRequired("Exercise ID"),
  showTutorial: z.string().optional()
});

export async function setExerciseTutorialVisibility(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, TutorialVisibilitySchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const { exerciseId, showTutorial: rawShow = "" } = parsed.data;
    const showTutorial = rawShow === "true";
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;

    await scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId).set(
      { showTutorial, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return success(showTutorial ? "Tutorial enabled for members." : "Tutorial hidden from members.", gymId, ["exercises"]);
  } catch (error) {
    return failure(error, "Unable to update tutorial visibility.");
  }
}

/**
 * Bulk-set tutorial visibility for every exercise in a muscle group.
 * Caller passes a comma-separated list of exerciseIds (from the server-rendered page).
 */
const GroupVisibilitySchema = z.object({
  showTutorial: z.string().optional(),
  exerciseIds: z.string().optional()
});

export async function setMuscleGroupTutorialVisibility(
  previousStateOrFormData: FormActionState | FormData,
  maybeFormData?: FormData
): Promise<FormActionState> {
  try {
    const currentUser = await requireOwner();
    const formData = getActionFormData(previousStateOrFormData, maybeFormData);
    const parsed = parseActionData(formData, GroupVisibilitySchema);
    if (!parsed.success) return parsed.state;

    const db = requireFirebase();
    const { showTutorial: rawShow = "", exerciseIds: rawIds = "" } = parsed.data;
    const showTutorial = rawShow === "true";
    const gymId = currentUser.gymId ?? PRIMARY_GYM_ID;
    const exerciseIds = rawIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (exerciseIds.length === 0) return success("Nothing to update.", undefined, ["exercises"]);

    const now = new Date().toISOString();
    const batch = db.batch();
    for (const exerciseId of exerciseIds) {
      const ref = scopedGymDoc(db, gymId, "exerciseCatalog", exerciseId);
      batch.set(ref, { showTutorial, updatedAt: now }, { merge: true });
    }
    await batch.commit();

    return success(
      showTutorial
        ? "Tutorials enabled for this group."
        : "Tutorials hidden for this group.",
      gymId
    );
  } catch (error) {
    return failure(error, "Unable to update tutorial visibility.");
  }
}
