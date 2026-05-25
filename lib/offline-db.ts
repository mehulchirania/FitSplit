import Dexie, { type Table } from 'dexie';
import type { LiftLog } from '@/types/domain';

// Extend LiftLog slightly for IndexedDB indexing
export type OfflineLiftLog = LiftLog & {
  // Dexie needs an auto-incrementing primary key or unique ID for easy retrieval
  offlineId?: number;
  synced: boolean;
};

export class FitSplitDB extends Dexie {
  liftLogs!: Table<OfflineLiftLog, number>;

  constructor() {
    super('FitSplitDB');

    // C13: Each version must declare a schema AND an upgrade() callback so that
    // future schema changes have a safe forward-migration path.  Existing data is
    // left untouched by the v1 → v2 upgrade (no structural change yet).
    this.version(1).stores({
      liftLogs: '++offlineId, id, ptSessionId, memberId, gymId, exerciseId, synced, loggedAt'
    });

    // v2 stub — no schema change yet; the upgrade hook exists so a future version
    // can safely migrate from v2 without skipping version history.
    this.version(2).stores({
      liftLogs: '++offlineId, id, ptSessionId, memberId, gymId, exerciseId, synced, loggedAt'
    }).upgrade(() => {
      // No-op: schema is identical to v1.  Replace with real migration logic when
      // new indexes or table renames are needed.
    });
  }
}

export const offlineDB = new FitSplitDB();

// Surface any IndexedDB open errors to the console so they don't silently fail
// (e.g. version conflict after a bad deploy, private browsing restrictions).
if (typeof window !== "undefined" && "indexedDB" in window) {
  offlineDB.open().catch((err) => {
    console.error("[FitSplit] Failed to open offline database:", err);
  });
}
