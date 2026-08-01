import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * RN equivalent of the web's Dexie `offlineDB.liftLogs` queue
 * (src/lib/offline-db.ts): a simple persisted list of lift sets logged while
 * offline, flushed via syncOfflineLiftsMobile once connectivity returns.
 * AsyncStorage (already a dependency for auth persistence) is enough for a
 * queue this size — no need for expo-sqlite's native module here.
 */
const STORAGE_KEY = "@fitsplit/offline-lift-queue";

export type QueuedLiftLog = {
  offlineId: string;
  gymId: string;
  memberId: string;
  exerciseId: string;
  weight: number;
  sets: number;
  reps: string;
  sessionId: string;
  loggedAt: string;
};

async function readQueue(): Promise<QueuedLiftLog[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedLiftLog[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function getQueuedLiftLogs(): Promise<QueuedLiftLog[]> {
  return readQueue();
}

export async function enqueueLiftLog(entry: Omit<QueuedLiftLog, "offlineId">): Promise<QueuedLiftLog> {
  const queued: QueuedLiftLog = { ...entry, offlineId: `${entry.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const queue = await readQueue();
  queue.push(queued);
  await writeQueue(queue);
  return queued;
}

/** Removes only the given offline entries — safe to call after a partial queue snapshot was synced. */
export async function removeQueuedLiftLogs(offlineIds: string[]): Promise<void> {
  if (offlineIds.length === 0) return;
  const idSet = new Set(offlineIds);
  const queue = await readQueue();
  await writeQueue(queue.filter((entry) => !idSet.has(entry.offlineId)));
}
