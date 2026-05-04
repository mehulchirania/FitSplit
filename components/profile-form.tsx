"use client";

import { useMemo, useState } from "react";

export function ProfileForm() {
  const [height, setHeight] = useState("174");
  const [weight, setWeight] = useState("72");

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
      <form className="form-panel">
        <h2>Basic details</h2>
        <div className="form-grid">
          <label>
            Full name
            <input defaultValue="Aarav Sharma" name="fullName" />
          </label>
          <label>
            Email
            <input defaultValue="aarav@example.com" name="email" type="email" />
          </label>
          <label>
            Phone
            <input defaultValue="+91 98765 43210" name="phone" />
          </label>
          <label>
            Age
            <input defaultValue="29" min="1" name="age" type="number" />
          </label>
          <label>
            Height
            <input
              min="1"
              name="height"
              onChange={(event) => setHeight(event.target.value)}
              type="number"
              value={height}
            />
          </label>
          <label>
            Weight
            <input
              min="1"
              name="weight"
              onChange={(event) => setWeight(event.target.value)}
              type="number"
              value={weight}
            />
          </label>
        </div>
        <button className="button button-primary" type="button">
          Save profile
        </button>
      </form>

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
