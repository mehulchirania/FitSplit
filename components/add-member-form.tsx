"use client";

import { createMemberWithMembership } from "@/lib/firebase/actions";
import { ConfirmActionForm } from "./confirm-action-form";

export function AddMemberForm({ defaultStartDate }: { defaultStartDate: string }) {
  return (
    <ConfirmActionForm
      action={createMemberWithMembership}
      className="form-panel"
      confirmMessage="This will create a member profile and membership record in Firebase."
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
        <label>
          Start date
          <input name="startDate" type="date" defaultValue={defaultStartDate} required />
        </label>
        <label>
          Duration
          <select name="durationMonths" defaultValue="3" required>
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </label>
        <label>
          Payment reference
          <input name="paymentReference" placeholder="UPI, cash, receipt" />
        </label>
      </div>
    </ConfirmActionForm>
  );
}
