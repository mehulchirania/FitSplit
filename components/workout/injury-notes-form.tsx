"use client";

const PRESETS = ["Shoulder pain", "Knee pain", "Lower back ache"] as const;

export function InjuryNotesForm({
  injury,
  onClear,
  onInjuryChange,
  onSave
}: {
  injury: string;
  onClear: () => void;
  onInjuryChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="injury-card">
      <p className="eyebrow">Trainer note</p>
      <h2 style={{ marginBottom: 6 }}>Injuries &amp; limitations</h2>
      <p style={{ fontSize: "0.87rem", color: "var(--text-soft)", marginBottom: 14 }}>
        Note any pain points or restrictions. Your trainer can see this and adjust your plan.
      </p>
      <div style={{ display: "flex", gap: "8px", marginBottom: 10, flexWrap: "wrap" }}>
        {PRESETS.map((preset) => (
          <button
            className="status-pill status-neutral"
            key={preset}
            onClick={() => onInjuryChange(preset)}
            style={{ cursor: "pointer", border: "none" }}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <label style={{ display: "grid", gap: 6, fontSize: "0.88rem" }}>
        <span style={{ fontWeight: 700 }}>Your note</span>
        <textarea
          onChange={(e) => onInjuryChange(e.target.value)}
          placeholder="e.g. left shoulder pain during overhead press"
          rows={3}
          value={injury}
        />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          className="button button-primary"
          disabled={!injury.trim()}
          onClick={onSave}
          type="button"
        >
          Save note
        </button>
        {injury && (
          <button
            className="button button-secondary"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
