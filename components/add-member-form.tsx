"use client";

import { createMemberProfile } from "@/lib/firebase/actions";
import { ConfirmActionForm } from "./confirm-action-form";

export function AddMemberForm() {
  return (
    <ConfirmActionForm
      action={createMemberProfile}
      className="form-panel"
      confirmMessage="This will create a FitSplit member profile in Firebase."
      confirmTitle="Add this member?"
      pendingLabel="Saving member..."
      submitLabel="Save member to Firebase"
    >
      <h2>Add member</h2>
      <div className="form-grid">
        <label>
          Full name
          <input
            name="fullName"
            placeholder="Member name"
            required
            autoComplete="name"
          />
        </label>
        <label>
          Email
          <input
            name="email"
            placeholder="member@example.com"
            type="email"
            required
            autoComplete="email"
          />
        </label>
        <label>
          Phone
          <input name="phone" placeholder="+91 ..." autoComplete="tel" />
        </label>
        <label>
          Goal
          <input name="goal" placeholder="Build muscle, fat loss, strength" />
        </label>
      </div>
    </ConfirmActionForm>
  );
}
