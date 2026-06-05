"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createMemberProfile } from "@/lib/firebase/actions";
import { callCreateMemberAccount } from "@/lib/firebase/functions";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import { FormActionContext, FieldError } from "./form-action-context";

const emptyForm = {
  email: "",
  fullName: "",
  goal: "",
  phone: "",
  username: ""
};

export function AddMemberForm() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(emptyForm);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [dismissedMessage, setDismissedMessage] = useState("");
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
    setDismissedMessage("");
    startTransition(async () => {
      try {
        const result = await callCreateMemberAccount({
          fullName: String(submittedForm.get("fullName") ?? ""),
          username: String(submittedForm.get("username") ?? ""),
          email: String(submittedForm.get("email") ?? ""),
          phone: String(submittedForm.get("phone") ?? ""),
          goal: String(submittedForm.get("goal") ?? "")
        });
        setStatus({ status: "success", message: result.data.message });
        setFormValues(emptyForm);
        router.refresh();
      } catch {
        const result = await createMemberProfile(initialFormActionState, submittedForm);
        setStatus(result);
        if (result.status === "success") {
          setFormValues(emptyForm);
          router.refresh();
        }
      }
    });
  }

  const showResultModal = status?.message && !isPending && dismissedMessage !== status.message;

  return (
    <FormActionContext.Provider value={status}>
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

      {showResultModal ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-live="polite" aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>{status?.status === "success" ? "Member saved" : "Could not save member"}</h2>
            <p className={`form-message form-message-${status?.status}`}>{status?.message}</p>
            <div className="quick-actions">
              <button className="button button-primary" onClick={() => setDismissedMessage(status?.message || "")} type="button">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FormActionContext.Provider>
  );
}
