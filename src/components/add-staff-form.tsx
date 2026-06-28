"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createOwnerProfile } from "@/lib/firebase/actions";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";

const emptyForm = { fullName: "", email: "", phone: "", staffType: "owner" };

export function AddStaffForm({ gymId }: { gymId: string }) {
  const router = useRouter();
  const [formValues, setFormValues] = useState(emptyForm);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setPendingForm(new FormData(event.currentTarget));
  }

  function confirmCreate() {
    if (!pendingForm) return;
    const form = pendingForm;
    setPendingForm(null);
    startTransition(async () => {
      const result = await createOwnerProfile(initialFormActionState, form);
      setStatus(result);
      if (result.status === "success") {
        setFormValues(emptyForm);
        router.refresh();
      }
    });
  }

  return (
    <>
      <form className="form-panel" onSubmit={handleSubmit}>
        <h2>Add staff</h2>
        <div className="form-grid">
          <label>
            Full name
            <input
              name="fullName"
              onChange={(e) => setFormValues((v) => ({ ...v, fullName: e.target.value }))}
              placeholder="Staff member name"
              required
              value={formValues.fullName}
            />
          </label>
          <label>
            <span className="flex items-center gap-2">Email <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>(optional)</span></span>
            <input
              name="email"
              onChange={(e) => setFormValues((v) => ({ ...v, email: e.target.value }))}
              placeholder="staff@gym.com"
              type="email"
              value={formValues.email}
            />
          </label>
          <label>
            Phone
            <input
              autoComplete="tel"
              inputMode="tel"
              name="phone"
              onChange={(e) => setFormValues((v) => ({ ...v, phone: e.target.value }))}
              placeholder="9876543210"
              required
              value={formValues.phone}
            />
          </label>
          <label>
            Role
            <select
              name="staffType"
              onChange={(e) => setFormValues((v) => ({ ...v, staffType: e.target.value }))}
              value={formValues.staffType}
            >
              <option value="owner">Owner</option>
              <option value="trainer">Trainer</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        </div>
        <input name="gymId" type="hidden" value={gymId} />
        <p style={{ fontSize: "0.82rem", color: "var(--text-faint)", margin: "8px 0 12px" }}>
          Default login password is <code>password</code>. Ask staff to change it after first login.
        </p>
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? "Adding staff..." : "Add staff member"}
        </button>
      </form>

      {pendingForm && (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Add this staff member?</h2>
            <p>A FitSplit login will be created with a default password of <strong>password</strong>.</p>
            <div className="quick-actions">
              <button className="button button-secondary" onClick={() => setPendingForm(null)} type="button">Cancel</button>
              <button className="button button-primary" onClick={confirmCreate} type="button">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="dialog-backdrop" role="presentation">
          <div aria-live="polite" aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>{status.status === "success" ? "Staff added" : "Could not add staff"}</h2>
            <p className={`form-message form-message-${status.status}`}>{status.message}</p>
            <div className="quick-actions">
              <button className="button button-primary" onClick={() => setStatus(null)} type="button">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
