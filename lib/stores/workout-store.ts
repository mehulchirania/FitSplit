import { create } from 'zustand';
import type { DayLog, LiftLog, SkipReason, WorkoutExercise } from '@/types/domain';
import type { FormActionState } from '@/types/action-state';

export type Modification = {
  injury: string;
  summary: string;
  swaps: Array<{ from: string; to: string; reason: string }>;
  addedStretches: Array<{ name: string; reason: string }>;
  routine: WorkoutExercise[];
};

export type PendingEvent = {
  confirmLabel: string;
  message: string;
  run: () => Promise<FormActionState>;
  title: string;
  liftExerciseId?: string;
  liftWeight?: number;
};

type WorkoutState = {
  // Session State
  isSessionActive: boolean;
  sessionId: string;
  elapsedSeconds: number;
  sessionStatus: FormActionState | null;
  isSessionPending: boolean;
  
  // AI Trainer & Modifications
  injury: string;
  modification: Modification | null;
  workoutMode: "default" | "ai";
  isAiSwapping: boolean;
  
  // Logs & PRs
  liftLogs: LiftLog[];
  offlineLogsCount: number;
  logSuccess: boolean;
  isNewPR: boolean;
  
  // Modals & Events
  pendingEvent: PendingEvent | null;
  eventStatus: FormActionState | null;
  isEventPending: boolean;
  
  // Program Selection
  selectedDayIndex: number;
  selectedExerciseIdForForm: string;
  
  // Day Logging (Skip/Other)
  dayLogs: DayLog[];
  skipMode: "none" | "skip" | "other";
  skipReason: SkipReason | "";
  skipNote: string;
  isDayLogging: boolean;
  dayLogStatus: FormActionState | null;

  // Actions
  setSessionActive: (isActive: boolean, id?: string) => void;
  setElapsedSeconds: (seconds: number | ((prev: number) => number)) => void;
  setSessionStatus: (status: FormActionState | null) => void;
  setIsSessionPending: (isPending: boolean) => void;
  
  setInjury: (injury: string) => void;
  setModification: (modification: Modification | null) => void;
  setWorkoutMode: (mode: "default" | "ai") => void;
  setIsAiSwapping: (isSwapping: boolean) => void;
  
  setLiftLogs: (logs: LiftLog[] | ((prev: LiftLog[]) => LiftLog[])) => void;
  addLiftLog: (log: LiftLog) => void;
  setOfflineLogsCount: (count: number) => void;
  setLogSuccess: (success: boolean) => void;
  setIsNewPR: (isNewPR: boolean) => void;
  
  setPendingEvent: (event: PendingEvent | null) => void;
  setEventStatus: (status: FormActionState | null) => void;
  setIsEventPending: (isPending: boolean) => void;
  
  setSelectedDayIndex: (index: number) => void;
  setSelectedExerciseIdForForm: (id: string) => void;
  
  setDayLogs: (logs: DayLog[] | ((prev: DayLog[]) => DayLog[])) => void;
  setSkipMode: (mode: "none" | "skip" | "other") => void;
  setSkipReason: (reason: SkipReason | "") => void;
  setSkipNote: (note: string) => void;
  setIsDayLogging: (isLogging: boolean) => void;
  setDayLogStatus: (status: FormActionState | null) => void;
};

export const useWorkoutStore = create<WorkoutState>((set) => ({
  isSessionActive: false,
  sessionId: "",
  elapsedSeconds: 0,
  sessionStatus: null,
  isSessionPending: false,
  
  injury: "",
  modification: null,
  workoutMode: "default",
  isAiSwapping: false,
  
  liftLogs: [],
  offlineLogsCount: 0,
  logSuccess: false,
  isNewPR: false,
  
  pendingEvent: null,
  eventStatus: null,
  isEventPending: false,
  
  selectedDayIndex: 0,
  selectedExerciseIdForForm: "",
  
  dayLogs: [],
  skipMode: "none",
  skipReason: "",
  skipNote: "",
  isDayLogging: false,
  dayLogStatus: null,

  setSessionActive: (isActive, id = "") => set({ isSessionActive: isActive, sessionId: id }),
  setElapsedSeconds: (seconds) => set((state) => ({ 
    elapsedSeconds: typeof seconds === 'function' ? seconds(state.elapsedSeconds) : seconds 
  })),
  setSessionStatus: (status) => set({ sessionStatus: status }),
  setIsSessionPending: (isPending) => set({ isSessionPending: isPending }),
  
  setInjury: (injury) => set({ injury }),
  setModification: (modification) => set({ modification }),
  setWorkoutMode: (mode) => set({ workoutMode: mode }),
  setIsAiSwapping: (isSwapping) => set({ isAiSwapping: isSwapping }),
  
  setLiftLogs: (logs) => set((state) => ({ 
    liftLogs: typeof logs === 'function' ? logs(state.liftLogs) : logs 
  })),
  addLiftLog: (log) => set((state) => ({ liftLogs: [log, ...state.liftLogs] })),
  setOfflineLogsCount: (count) => set({ offlineLogsCount: count }),
  setLogSuccess: (success) => set({ logSuccess: success }),
  setIsNewPR: (isNewPR) => set({ isNewPR }),
  
  setPendingEvent: (event) => set({ pendingEvent: event }),
  setEventStatus: (status) => set({ eventStatus: status }),
  setIsEventPending: (isPending) => set({ isEventPending: isPending }),
  
  setSelectedDayIndex: (index) => set({ selectedDayIndex: index }),
  setSelectedExerciseIdForForm: (id) => set({ selectedExerciseIdForForm: id }),
  
  setDayLogs: (logs) => set((state) => ({ 
    dayLogs: typeof logs === 'function' ? logs(state.dayLogs) : logs 
  })),
  setSkipMode: (mode) => set({ skipMode: mode }),
  setSkipReason: (reason) => set({ skipReason: reason }),
  setSkipNote: (note) => set({ skipNote: note }),
  setIsDayLogging: (isLogging) => set({ isDayLogging: isLogging }),
  setDayLogStatus: (status) => set({ dayLogStatus: status }),
}));
