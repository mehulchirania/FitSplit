"use client";

import { useMemo, useState } from "react";
import { updateProfileMetrics } from "@/lib/firebase/actions";
import type { ProfileMetrics } from "@/types/domain";
import { ConfirmActionForm } from "./confirm-action-form";

const slots = [
  { id: "A", label: "Slot A", time: "6 AM - 10 AM" },
  { id: "B", label: "Slot B", time: "10 AM - 12 PM" },
  { id: "C", label: "Slot C", time: "4 PM - 6 PM" },
  { id: "D", label: "Slot D", time: "6 PM - 9 PM" }
] as const;

export function ProfileForm({
  memberId,
  profile
}: {
  memberId: string;
  profile: ProfileMetrics;
}) {
  const [height, setHeight] = useState(String(profile.heightCm ?? ""));
  const [weight, setWeight] = useState(String(profile.weightKg ?? ""));

  const bmi = useMemo(() => {
    const heightCm = Number(height);
    const weightKg = Number(weight);

    if (!heightCm || !weightKg) {
      return null;
    }

    const heightMeters = heightCm / 100;
    return weightKg / (heightMeters * heightMeters);
  }, [height, weight]);

  const bmiLabel = useMemo(() => {
    if (!bmi) {
      return "Enter height and weight";
    }

    if (bmi < 18.5) {
      return "Below normal range";
    }

    if (bmi < 25) {
      return "Normal range";
    }

    if (bmi < 30) {
      return "Above normal range";
    }

    return "High range";
  }, [bmi]);

  return (
    <section className="content-grid">
      <ConfirmActionForm
        action={updateProfileMetrics}
        className="form-panel"
        confirmMessage="This will update your profile details and BMI inputs."
        confirmTitle="Save profile changes?"
        pendingLabel="Saving profile..."
        submitLabel="Save profile"
      >
        <h2>Basic details</h2>
        <input name="memberId" type="hidden" value={memberId} />
        <div className="form-grid">
          <label>
            Full name
            <input defaultValue={profile.fullName} name="fullName" required />
          </label>
          <label>
            Email
            <input defaultValue={profile.email} name="email" type="email" required />
          </label>
          <label>
            Phone
            <input defaultValue={profile.phone} inputMode="tel" name="phone" pattern="(\\+91[\\s-]?)?[6-9][0-9]{9}" />
          </label>
          <label>
            Gender
            <select defaultValue={profile.gender ?? ""} name="gender">
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Date of birth
            <input defaultValue={profile.dob} name="dob" type="date" />
          </label>
          <label>
            Age
            <input defaultValue={profile.age} min="1" name="age" type="number" />
          </label>
          <label>
            Height
            <input
              min="1"
              name="heightCm"
              onChange={(event) => setHeight(event.target.value)}
              type="number"
              value={height}
            />
          </label>
          <label>
            Weight
            <input
              min="1"
              name="weightKg"
              onChange={(event) => setWeight(event.target.value)}
              type="number"
              value={weight}
            />
          </label>
          <label>
            Primary slot
            <select defaultValue={profile.primarySlot ?? "A"} name="primarySlot">
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.label}: {slot.time}</option>
              ))}
            </select>
          </label>
          <label>
            Secondary slot
            <select defaultValue={profile.secondarySlot ?? "D"} name="secondarySlot">
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.label}: {slot.time}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Fitness goals
          <textarea defaultValue={profile.fitnessGoals} name="fitnessGoals" placeholder="Fat loss, strength, muscle gain, sport-specific goals..." rows={3} />
        </label>
        <label>
          Medical notes
          <textarea defaultValue={profile.medicalNotes} name="medicalNotes" placeholder="Medical conditions your trainer should know about" rows={3} />
        </label>
        <label>
          Injury and pain management
          <textarea defaultValue={profile.injuryNotes} name="injuryNotes" placeholder="Injuries, pain areas, mobility issues, restrictions" rows={4} />
        </label>
        <label>
          Assigned trainer
          <input defaultValue={profile.assignedTrainer} name="assignedTrainer" placeholder="Trainer name" />
        </label>
      </ConfirmActionForm>

      <aside className="summary-panel bmi-panel">
        <p className="eyebrow">Calculated BMI</p>
        <strong>{bmi ? bmi.toFixed(1) : "--"}</strong>
        <span className="status-pill status-active">{bmiLabel}</span>
        <p>
          BMI updates automatically as height and weight change. This is a
          basic screening metric, not a full health assessment.
        </p>
      </aside>
    </section>
  );
}
