"use client";

import { useActionState, useRef, useState } from "react";
import { bookPTSession } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { Member } from "@/types/domain";

const DURATIONS = [30, 45, 60, 90, 120] as const;

/** Formats a Date to the value required by <input type="datetime-local"> */
function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Default slot = tomorrow at 6 AM */
function defaultScheduledAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return toDatetimeLocal(d);
}

export function PTBookingForm({
  members,
  trainers,
  preselectedMemberId,
  preselectedTrainerId,
  onSuccess
}: {
  members: Pick<Member, "id" | "fullName">[];
  trainers: Pick<Member, "id" | "fullName">[];
  preselectedMemberId?: string;
  preselectedTrainerId?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(bookPTSession, initialFormActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedMemberId, setSelectedMemberId] = useState(preselectedMemberId ?? "");
  const [selectedTrainerId, setSelectedTrainerId] = useState(preselectedTrainerId ?? "");

  // Reset form on success
  const prevStatus = useRef(state.status);
  if (prevStatus.current !== state.status) {
    prevStatus.current = state.status;
    if (state.status === "success") {
      formRef.current?.reset();
      setSelectedMemberId(preselectedMemberId ?? "");
      setSelectedTrainerId(preselectedTrainerId ?? "");
      onSuccess?.();
    }
  }

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);

  return (
    <form action={formAction} className="pt-booking-form" ref={formRef}>
      {/* Hidden resolved names for display on session cards */}
      <input type="hidden" name="memberName" value={selectedMember?.fullName ?? ""} />
      <input type="hidden" name="trainerName" value={selectedTrainer?.fullName ?? ""} />

      <div className="form-grid">
        <label>
          Member
          <select
            name="memberId"
            required
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            <option value="">— Select member —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </select>
        </label>

        <label>
          Trainer
          <select
            name="trainerId"
            required
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
          >
            <option value="">— Select trainer —</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
        </label>

        <label>
          Date &amp; time
          <input
            defaultValue={defaultScheduledAt()}
            name="scheduledAt"
            required
            type="datetime-local"
          />
        </label>

        <label>
          Duration
          <select defaultValue="60" name="durationMinutes">
            {DURATIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </label>

        <label className="form-grid-full">
          Session notes / goals <span className="optional-label">(optional)</span>
          <textarea
            maxLength={400}
            name="notes"
            placeholder="e.g. Focus on lower body. Member has mild knee pain — avoid deep squats."
            rows={2}
          />
        </label>
      </div>

      {state.status === "error" && state.message && (
        <p className="form-message form-message-error" role="alert">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="form-message form-message-success" role="status">Session booked successfully.</p>
      )}

      <div className="form-actions">
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? "Booking��" : "Book PT session"}
        </button>
      </div>
    </form>
  );
}
