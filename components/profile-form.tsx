"use client";

import { useMemo, useState } from "react";
import { updateProfileMetrics } from "@/lib/firebase/actions";
import type { ProfileMetrics } from "@/types/domain";
import { ConfirmActionForm } from "./confirm-action-form";

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
            <input defaultValue={profile.phone} name="phone" />
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
        </div>
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
