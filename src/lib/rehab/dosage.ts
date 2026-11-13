/**
 * Dosage helpers with no catalogue import, so the client-side player can use them without
 * pulling the whole catalogue into its bundle.
 */
import type { Dosage } from "./catalog";

const DEFAULT_REP_SECONDS = 3;

export type Side = "left" | "right";

/** The ordered units the player walks through for one exercise: each set, each side. */
export function dosageUnits(dosage: Dosage): Array<{ set: number; side: Side | null }> {
  const units: Array<{ set: number; side: Side | null }> = [];
  for (let set = 1; set <= dosage.sets; set++) {
    if (dosage.perSide) {
      units.push({ set, side: "left" }, { set, side: "right" });
    } else {
      units.push({ set, side: null });
    }
  }
  return units;
}

/** Seconds of work in one unit (one set on one side). */
export function unitWorkSeconds(dosage: Dosage): number {
  return dosage.kind === "hold" ? dosage.seconds : dosage.reps * (dosage.repSeconds ?? DEFAULT_REP_SECONDS);
}

/** "30 s hold × 2 each side", "12 reps × 2". */
export function dosageLabel(dosage: Dosage): string {
  const amount = dosage.kind === "hold" ? `${dosage.seconds} s hold` : `${dosage.reps} reps`;
  return `${amount} × ${dosage.sets}${dosage.perSide ? " each side" : ""}`;
}
