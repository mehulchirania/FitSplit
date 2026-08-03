"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { logBodyWeight } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";
import type { BodyMetricLog } from "@/types/domain";

/**
 * BodyWeightLogger — surfaced on /profile (member) and /owner/members/[id] (owner).
 *
 * Three sections:
 *  1. Latest weight headline + 7/30/90 day delta vs the entry from that long ago.
 *  2. Inline log form with weight, optional body fat %, and a notes field.
 *  3. SVG sparkline over the last 12 entries — minimal so it doesn't compete with
 *     the lift-progress chart that lives on the same page.
 *
 * Server action is logBodyWeight; the form does optimistic prepend so the chart
 * updates without a full re-render.
 */
export function BodyWeightLogger({
  memberId,
  initialLogs
}: {
  memberId: string;
  initialLogs: BodyMetricLog[];
}) {
  const [logs, setLogs] = useState<BodyMetricLog[]>(initialLogs);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [nowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  const latest = logs[0];
  const sorted = useMemo(
    () => [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [logs]
  );

  // Delta calculations — compare current weight to the entry closest to N days ago.
  function deltaSince(days: number): { delta: number; from: BodyMetricLog } | null {
    if (!latest || sorted.length < 2) return null;
    const cutoff = nowMs - days * 24 * 60 * 60 * 1000;
    // Find the most recent log AT or BEFORE the cutoff. Walk sorted (oldest→newest)
    // and pick the one furthest in but not past the cutoff.
    let candidate: BodyMetricLog | undefined;
    for (const log of sorted) {
      if (new Date(log.loggedAt).getTime() <= cutoff) {
        candidate = log;
      } else {
        break;
      }
    }
    if (!candidate || candidate.id === latest.id) return null;
    return { delta: latest.weightKg - candidate.weightKg, from: candidate };
  }

  const delta7 = deltaSince(7);
  const delta30 = deltaSince(30);
  const delta90 = deltaSince(90);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;

    const formData = new FormData(event.currentTarget);
    formData.set("memberId", memberId);

    // Optimistic prepend so the sparkline updates instantly.
    const optimistic: BodyMetricLog = {
      id: `optimistic-${Date.now()}`,
      memberId,
      weightKg: Number(weight),
      bodyFatPct: bodyFat ? Number(bodyFat) : undefined,
      notes: notes || undefined,
      loggedAt: new Date().toISOString()
    };
    setLogs((current) => [optimistic, ...current]);

    startTransition(async () => {
      const result = await logBodyWeight(initialFormActionState, formData);
      setMessage({
        kind: result.status === "success" ? "success" : "error",
        text: result.message
      });
      if (result.status === "success") {
        setWeight("");
        setBodyFat("");
        setNotes("");
      } else {
        // Rollback optimistic entry on error
        setLogs((current) => current.filter((l) => l.id !== optimistic.id));
      }
    });
  }

  return (
    <section className="list-panel" style={{ marginTop: 16 }}>
      <div className="panel-title">
        <h2>Body weight</h2>
        {latest && (
          <span className="status-pill status-neutral">
            Last logged {new Date(latest.loggedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
          </span>
        )}
      </div>

      <div className="bwl-grid">
        {/* Headline + deltas */}
        <div className="bwl-headline">
          <div className="bwl-current">
            <span>Current</span>
            <strong>{latest ? `${latest.weightKg.toFixed(1)} kg` : "—"}</strong>
          </div>
          <div className="bwl-deltas">
            <DeltaPill label="7d" value={delta7?.delta} />
            <DeltaPill label="30d" value={delta30?.delta} />
            <DeltaPill label="90d" value={delta90?.delta} />
          </div>
        </div>

        {/* Sparkline */}
        {sorted.length >= 2 ? <BodyWeightSparkline logs={sorted.slice(-12)} /> : (
          <p className="bwl-empty">Log at least 2 weights to see a trend chart.</p>
        )}

        {/* Log form */}
        <form className="bwl-form" onSubmit={handleSubmit}>
          <div className="bwl-form-row">
            <label>
              Weight (kg)
              <input
                inputMode="decimal"
                max={500}
                min={10}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="72.5"
                required
                step="0.1"
                type="number"
                value={weight}
              />
            </label>
            <label>
              Body fat %
              <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontWeight: 500 }}>optional</span>
              <input
                inputMode="decimal"
                max={100}
                min={0}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="18.5"
                step="0.1"
                type="number"
                value={bodyFat}
              />
            </label>
          </div>
          <label>
            Notes
            <span style={{ fontSize: "0.72rem", color: "var(--text-faint)", fontWeight: 500 }}>optional</span>
            <input
              maxLength={140}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. post-workout, after meal..."
              type="text"
              value={notes}
            />
          </label>
          <button className="button button-primary" disabled={isPending} type="submit">
            {isPending ? "Logging..." : "Log weight"}
          </button>
          {message && (
            <p className={`form-message form-message-${message.kind}`} style={{ marginTop: 6 }}>
              {message.text}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

function DeltaPill({ label, value }: { label: string; value?: number }) {
  if (value == null || Number.isNaN(value)) {
    return (
      <div className="bwl-delta bwl-delta--empty">
        <span>{label}</span>
        <strong>—</strong>
      </div>
    );
  }
  const isPositive = value > 0;
  const isFlat = Math.abs(value) < 0.1;
  return (
    <div className={`bwl-delta ${isFlat ? "bwl-delta--flat" : isPositive ? "bwl-delta--up" : "bwl-delta--down"}`}>
      <span>{label}</span>
      <strong>
        {isFlat ? "±0" : `${isPositive ? "+" : ""}${value.toFixed(1)}`}
      </strong>
    </div>
  );
}

function BodyWeightSparkline({ logs }: { logs: BodyMetricLog[] }) {
  // Always assume logs is sorted oldest→newest by the caller.
  if (logs.length < 2) return null;
  const weights = logs.map((l) => l.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  // Pad the range so a flat line still renders a centered horizontal.
  const range = max - min || 1;
  const width = 280;
  const height = 64;
  const padding = 4;
  const stepX = (width - padding * 2) / (logs.length - 1);
  const points = logs.map((log, idx) => {
    const x = padding + idx * stepX;
    const y = padding + (1 - (log.weightKg - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="bwl-chart" aria-label="Body weight trend over the last 12 entries">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <linearGradient id="bwl-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          className="bwl-sparkline-area"
          d={`${pathD} L ${points[points.length - 1]?.split(",")[0]},${height} L ${points[0]?.split(",")[0]},${height} Z`}
          fill="url(#bwl-grad)"
        />
        <path d={pathD} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* End-of-series dot */}
        {points.length > 0 && (() => {
          const [lx, ly] = points[points.length - 1].split(",");
          return <circle cx={lx} cy={ly} r={3} fill="var(--brand)" />;
        })()}
      </svg>
      <div className="bwl-chart-axis">
        <span>{logs[0].weightKg.toFixed(1)} kg</span>
        <span>{logs[logs.length - 1].weightKg.toFixed(1)} kg</span>
      </div>
    </div>
  );
}
