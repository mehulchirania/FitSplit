"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { FormActionState } from "@/types/action-state";
import { FormActionContext, FieldError } from "./form-action-context";

export type AddMemberPreview = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  goal: string;
  programTitle?: string;
};

const emptyForm = {
  email: "",
  fullName: "",
  goal: "",
  phone: "",
  username: "",
  programId: ""
};

export function AddMemberForm({
  programs,
  isPending,
  error,
  onConfirm
}: {
  programs: { id: string; title: string }[];
  isPending: boolean;
  error: FormActionState | null;
  onConfirm: (formData: FormData, preview: AddMemberPreview) => void;
}) {
  const [formValues, setFormValues] = useState(emptyForm);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

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
    const programTitle = programs.find((p) => p.id === formValues.programId)?.title;

    onConfirm(submittedForm, {
      fullName: formValues.fullName,
      username: formValues.username,
      email: formValues.email,
      phone: formValues.phone,
      goal: formValues.goal || "General fitness",
      programTitle
    });

    setPendingForm(null);
    // Reset immediately — the row already landed in the list optimistically,
    // so there's nothing left to wait for from the member's point of view.
    setFormValues(emptyForm);
  }

  const selectedProgramTitle = programs.find((p) => p.id === formValues.programId)?.title;

  return (
    <FormActionContext.Provider value={error}>
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
            <FieldError name="fullName" />
          </label>
          <label>
            Login username
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => updateValue("username", event.target.value)}
              pattern="[A-Za-z0-9._-]{3,32}"
              placeholder="e.g. rahul-sharma"
              required
              title="Use 3-32 letters, numbers, dots, underscores, or hyphens."
              value={formValues.username}
            />
            <FieldError name="username" />
          </label>
          <label>
            <span className="flex items-center gap-2">Email <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>(optional)</span></span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => updateValue("email", event.target.value)}
              placeholder="member@example.com"
              type="email"
              value={formValues.email}
            />
            <FieldError name="email" />
          </label>
          <label>
            Phone
            <input
              autoComplete="tel"
              inputMode="tel"
              name="phone"
              onChange={(event) => updateValue("phone", event.target.value)}
              placeholder="9876543210"
              required
              value={formValues.phone}
            />
            <FieldError name="phone" />
          </label>
          <label>
            Goal
            <input
              name="goal"
              onChange={(event) => updateValue("goal", event.target.value)}
              placeholder="Build muscle, fat loss, strength"
              value={formValues.goal}
            />
            <FieldError name="goal" />
          </label>
          <label>
            <span className="flex items-center gap-2">Split <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>(optional)</span></span>
            <select
              name="programId"
              onChange={(event) => updateValue("programId", event.target.value)}
              value={formValues.programId}
            >
              <option value="">No split yet — assign later</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.title}</option>
              ))}
            </select>
            <FieldError name="programId" />
          </label>
        </div>
        <button className="button button-primary" disabled={isPending} type="submit">
          Save member
        </button>
      </form>

      {pendingForm ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Are you sure you want to add member: {formValues.fullName}?</h2>
            <dl className="member-preview-list">
              <div className="member-preview-list__row">
                <dt>Username</dt>
                <dd>@{formValues.username}</dd>
              </div>
              <div className="member-preview-list__row">
                <dt>Email</dt>
                <dd>{formValues.email || "Not provided"}</dd>
              </div>
              <div className="member-preview-list__row">
                <dt>Phone</dt>
                <dd>{formValues.phone}</dd>
              </div>
              <div className="member-preview-list__row">
                <dt>Goal</dt>
                <dd>{formValues.goal || "General fitness"}</dd>
              </div>
              <div className="member-preview-list__row">
                <dt>Split</dt>
                <dd>{selectedProgramTitle || "Not assigned"}</dd>
              </div>
            </dl>
            <div className="quick-actions">
              <button className="button button-secondary" onClick={() => setPendingForm(null)} type="button">
                Cancel
              </button>
              <button className="button button-primary" onClick={confirmCreate} type="button">
                Add member
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FormActionContext.Provider>
  );
}
