import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DayLog, LiftLog, SkipReason } from '@/types/domain';
import type { FormActionState } from '@/types/action-state';

type WorkoutState = {
  // Session State
  isSessionActive: boolean;
  sessionId: string;
  elapsedSeconds: number;
  sessionStatus: FormActionState | null;
  isSessionPending: boolean;

  // Trainer note (injury / limitation saved to profile)
  injury: string;

  // Logs & PRs
  liftLogs: LiftLog[];
  offlineLogsCount: number;
  logSuccess: boolean;
  isNewPR: boolean;

  // Modals & Events
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

  setLiftLogs: (logs: LiftLog[] | ((prev: LiftLog[]) => LiftLog[])) => void;
  addLiftLog: (log: LiftLog) => void;
  setOfflineLogsCount: (count: number) => void;
  setLogSuccess: (success: boolean) => void;
  setIsNewPR: (isNewPR: boolean) => void;

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

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      isSessionActive: false,
      sessionId: "",
      elapsedSeconds: 0,
      sessionStatus: null,
      isSessionPending: false,

      injury: "",

      liftLogs: [],
      offlineLogsCount: 0,
      logSuccess: false,
      isNewPR: false,

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

      setLiftLogs: (logs) => set((state) => ({
        liftLogs: typeof logs === 'function' ? logs(state.liftLogs) : logs
      })),
      addLiftLog: (log) => set((state) => ({ liftLogs: [log, ...state.liftLogs] })),
      setOfflineLogsCount: (count) => set({ offlineLogsCount: count }),
      setLogSuccess: (success) => set({ logSuccess: success }),
      setIsNewPR: (isNewPR) => set({ isNewPR }),

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
    }),
    {
      name: "fitsplit-workout",
      // sessionStorage: cleared when the tab closes.
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage
      ),
      partialize: (state) => ({
        isSessionActive: state.isSessionActive,
        sessionId: state.sessionId,
        elapsedSeconds: state.elapsedSeconds,
        injury: state.injury,
        liftLogs: state.liftLogs,
        selectedDayIndex: state.selectedDayIndex,
        dayLogs: state.dayLogs,
        skipMode: state.skipMode,
        skipReason: state.skipReason,
        skipNote: state.skipNote,
      }),
    }
  )
);
