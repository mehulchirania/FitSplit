"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { createGymWorkspace } from "@/lib/firebase/actions";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyForm = { name: "", slug: "", location: "", status: "active", phone: "", email: "" };

export function AddGymForm() {
  const [formValues, setFormValues] = useState(emptyForm);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [status, setStatus] = useState<FormActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewSlug = formValues.slug.trim() || slugify(formValues.name);

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
      const result = await createGymWorkspace(initialFormActionState, form);
      setStatus(result);
      if (result.status === "success") setFormValues(emptyForm);
    });
  }

  return (
    <>
      <form className="form-panel" onSubmit={handleSubmit}>
        <h2>Add gym</h2>
        <div className="form-grid">
          <label>
            Gym name
            <input
              name="name"
              onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Example Fitness"
              required
              value={formValues.name}
            />
          </label>
          <label>
            Gym slug
            <input
              name="slug"
              onChange={(e) => setFormValues((v) => ({ ...v, slug: e.target.value }))}
              placeholder={slugify(formValues.name) || "auto-generated"}
              value={formValues.slug}
            />
            {previewSlug && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginTop: 3, display: "block" }}>
                ID will be: <code>{previewSlug}</code>
              </span>
            )}
          </label>
          <label>
            Location
            <input
              name="location"
              onChange={(e) => setFormValues((v) => ({ ...v, location: e.target.value }))}
              placeholder="City, State"
              value={formValues.location}
            />
          </label>
          <label>
            Status
            <select
              name="status"
              onChange={(e) => setFormValues((v) => ({ ...v, status: e.target.value }))}
              value={formValues.status}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            Contact phone
            <input
              inputMode="tel"
              name="phone"
              onChange={(e) => setFormValues((v) => ({ ...v, phone: e.target.value }))}
              value={formValues.phone}
            />
          </label>
          <label>
            Contact email
            <input
              name="email"
              onChange={(e) => setFormValues((v) => ({ ...v, email: e.target.value }))}
              type="email"
              value={formValues.email}
            />
          </label>
        </div>
        <button className="button button-primary" disabled={isPending || !formValues.name.trim()} type="submit">
          {isPending ? "Adding gym..." : "Add gym"}
        </button>
      </form>

      {pendingForm && (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>Add new gym?</h2>
            <p>This will create a new gym workspace with ID <strong>{previewSlug}</strong>. Staff can be assigned after creation.</p>
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
            <h2>{status.status === "success" ? "Gym added" : "Could not add gym"}</h2>
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
