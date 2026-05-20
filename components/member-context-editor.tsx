"use client";

import { useState } from "react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { updateOwnerMemberContext } from "@/lib/firebase/actions";
import type { Member, ProfileMetrics } from "@/types/domain";

export function MemberContextEditor({
  bmi,
  member,
  profile
}: {
  bmi: string | null;
  member: Member;
  profile: ProfileMetrics;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function cancelEdit() {
    setIsEditing(false);
    setFormKey((value) => value + 1);
  }

  return (
    <section className="list-panel mpd-context-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Profile details</p>
          <h2>Member context</h2>
        </div>
        <button
          className="button button-secondary mpd-edit-trigger"
          onClick={() => setIsEditing((value) => !value)}
          type="button"
        >
          {isEditing ? "Close edit" : "Edit details"}
        </button>
      </div>

      {!isEditing ? (
        <div className="mpd-context-grid">
          <div className="mpd-context-card">
            <span>Training goal</span>
            <strong>{profile.fitnessGoals || member.goal || "Not recorded"}</strong>
          </div>
          <div className="mpd-context-card">
            <span>Body metrics</span>
            <strong>
              {[
                profile.weightKg ? `${profile.weightKg} kg` : "",
                profile.heightCm ? `${profile.heightCm} cm` : "",
                profile.age ? `${profile.age} yrs` : "",
                bmi ? `BMI ${bmi}` : ""
              ].filter(Boolean).join(" / ") || "Not recorded"}
            </strong>
          </div>
          <div className="mpd-context-card">
            <span>Medical notes</span>
            <strong>{profile.medicalNotes || "No notes added"}</strong>
          </div>
          <div className="mpd-context-card">
            <span>Injury / pain notes</span>
            <strong>{profile.injuryNotes || "No restrictions logged"}</strong>
          </div>
        </div>
      ) : (
        <ConfirmActionForm
          action={updateOwnerMemberContext}
          className="mpd-edit-form"
          confirmMessage="Update this member's contact details, metrics, medical notes, and training context?"
          confirmTitle="Save member profile?"
          key={formKey}
          pendingLabel="Saving..."
          submitLabel="Save member profile"
        >
          <input name="memberId" type="hidden" value={member.id} />
          <div className="form-grid">
            <label>
              Full name
              <input defaultValue={member.fullName} name="fullName" required />
            </label>
            <label>
              Email
              <input defaultValue={member.email} name="email" required type="email" />
            </label>
            <label>
              Phone
              <input defaultValue={member.phone} name="phone" />
            </label>
            <label>
              Short goal
              <input defaultValue={member.goal} name="goal" />
            </label>
            <label>
              Age
              <input defaultValue={profile.age ?? ""} inputMode="numeric" min="1" name="age" type="number" />
            </label>
            <label>
              Gender
              <input defaultValue={profile.gender ?? ""} name="gender" />
            </label>
            <label>
              DOB
              <input defaultValue={profile.dob ?? ""} name="dob" type="date" />
            </label>
            <label>
              Height (cm)
              <input defaultValue={profile.heightCm ?? ""} inputMode="decimal" min="1" name="heightCm" type="number" />
            </label>
            <label>
              Weight (kg)
              <input defaultValue={profile.weightKg ?? ""} inputMode="decimal" min="1" name="weightKg" type="number" />
            </label>
            <label>
              Assigned trainer
              <input defaultValue={profile.assignedTrainer ?? ""} name="assignedTrainer" />
            </label>
            <label>
              Primary slot
              <select defaultValue={profile.primarySlot ?? "A"} name="primarySlot">
                <option value="A">Slot A · 6 AM - 10 AM</option>
                <option value="B">Slot B · 10 AM - 12 PM</option>
                <option value="C">Slot C · 4 PM - 6 PM</option>
                <option value="D">Slot D · 6 PM - 9 PM</option>
              </select>
            </label>
            <label>
              Secondary slot
              <select defaultValue={profile.secondarySlot ?? "D"} name="secondarySlot">
                <option value="A">Slot A · 6 AM - 10 AM</option>
                <option value="B">Slot B · 10 AM - 12 PM</option>
                <option value="C">Slot C · 4 PM - 6 PM</option>
                <option value="D">Slot D · 6 PM - 9 PM</option>
              </select>
            </label>
            <label className="form-grid-full">
              Fitness goals
              <textarea defaultValue={profile.fitnessGoals || member.goal || ""} name="fitnessGoals" rows={3} />
            </label>
            <label className="form-grid-full">
              Medical notes
              <textarea defaultValue={profile.medicalNotes ?? ""} name="medicalNotes" rows={3} />
            </label>
            <label className="form-grid-full">
              Injury / pain notes
              <textarea defaultValue={profile.injuryNotes ?? ""} name="injuryNotes" rows={3} />
            </label>
          </div>
          <button className="button button-secondary mpd-cancel-edit" onClick={cancelEdit} type="button">
            Cancel edit
          </button>
        </ConfirmActionForm>
      )}
    </section>
  );
}
