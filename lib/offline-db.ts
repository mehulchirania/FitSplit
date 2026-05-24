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
    
    // Define tables and indexes
    this.version(1).stores({
      liftLogs: '++offlineId, id, ptSessionId, memberId, gymId, exerciseId, synced, loggedAt'
    });
  }
}

export const offlineDB = new FitSplitDB();
