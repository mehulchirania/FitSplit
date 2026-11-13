"use client";

import { useMemo, useState } from "react";
import { updateProfileMetrics } from "@/lib/firebase/actions";
import { formatPhone } from "@/lib/phone-identity";
import type { ProfileMetrics } from "@/types/domain";
import { ConfirmActionForm } from "./confirm-action-form";
import { FieldError } from "./form-action-context";

export function ProfileForm({ profile }: { profile: ProfileMetrics }) {
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
        <div className="form-grid">
          <label>
            Full name
            <input defaultValue={profile.fullName} name="fullName" required />
            <FieldError name="fullName" />
          </label>
          <label>
            Mobile number
            <input defaultValue={profile.phone ? formatPhone(profile.phone) : ""} disabled name="phone" type="tel" />
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
            <FieldError name="dob" />
          </label>
          <label>
            Age
            <input defaultValue={profile.age} min="1" name="age" type="number" />
            <FieldError name="age" />
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
            <FieldError name="heightCm" />
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
            <FieldError name="weightKg" />
          </label>
        </div>
        <label>
          Fitness goals
          <textarea defaultValue={profile.fitnessGoals} name="fitnessGoals" placeholder="Fat loss, strength, muscle gain, sport-specific goals..." rows={3} />
          <FieldError name="fitnessGoals" />
        </label>
        <label>
          Medical notes
          <textarea defaultValue={profile.medicalNotes} name="medicalNotes" placeholder="Anything worth keeping in mind when you train" rows={3} />
          <FieldError name="medicalNotes" />
        </label>
        <label>
          Injury and pain management
          <textarea defaultValue={profile.injuryNotes} name="injuryNotes" placeholder="Injuries, pain areas, mobility issues, restrictions" rows={4} />
          <FieldError name="injuryNotes" />
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
