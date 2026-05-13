"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { createMemberProfile } from "@/lib/firebase/actions";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";

const emptyForm = {
  email: "",
  fullName: "",
  goal: "",
  phone: ""
};

export function AddMemberForm() {
  const [formValues, setFormValues] = useState(emptyForm);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateValue(key: keyof typeof emptyForm, value: string) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setPendingForm(new FormData(event.currentTarget));
  }

  function confirmCreate() {
    if (!pendingForm) {
      return;
    }

    const submittedForm = pendingForm;
    setPendingForm(null);
    startTransition(async () => {
      const result = await createMemberProfile(initialFormActionState, submittedForm);
      setStatus(result);
      if (result.status === "success") {
        setFormValues(emptyForm);
      }
    });
  }

  return (
    <>
      <form className="form-panel" onSubmit={handleSubmit}>
        <h2>Add member</h2>
        <div className="form-grid">
          <label>
            Full name
            <input
              autoComplete="name"
              name="fullName"
              onChange={(event) => updateValue("fullName", event.target.value)}
              placeholder="Member name"
              required
              value={formValues.fullName}
            />
          </label>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => updateValue("email", event.target.value)}
              placeholder="member@example.com"
              required
              type="email"
              value={formValues.email}
            />
          </label>
          <label>
            Phone
            <input
              autoComplete="tel"
              name="phone"
              onChange={(event) => updateValue("phone", event.target.value)}
              placeholder="+91 ..."
              value={formValues.phone}
            />
          </label>
          <label>
            Goal
            <input
              name="goal"
              onChange={(event) => updateValue("goal", event.target.value)}
              placeholder="Build muscle, fat loss, strength"
              value={formValues.goal}
            />
          </label>
        </div>
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? "Saving member..." : "Save member"}
        </button>
      </form>

      {pendingForm ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Add this member?</h2>
            <p>This will create a FitSplit member profile after validation passes.</p>
            <div className="quick-actions">
              <button className="button button-secondary" onClick={() => setPendingForm(null)} type="button">
                Cancel
              </button>
              <button className="button button-primary" onClick={confirmCreate} type="button">
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {status ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-live="polite" aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>{status.status === "success" ? "Member saved" : "Could not save member"}</h2>
            <p className={`form-message form-message-${status.status}`}>{status.message}</p>
            <div className="quick-actions">
              <button className="button button-primary" onClick={() => setStatus(null)} type="button">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
