"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [60, 90, 120] as const;

interface Props {
  onDone?: () => void;
}

export function RestTimer({ onDone }: Props) {
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start(secs: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(secs);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null || r <= 1) {
          clearInterval(intervalRef.current!);
          onDone?.();
          // Brief beep via AudioContext
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          } catch {}
          return null;
        }
        return r - 1;
      });
    }, 1000);
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(null);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const pct = remaining !== null ? (remaining / duration) * 100 : 0;
  const isRunning = remaining !== null;

  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference * (1 - pct / 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px" }}>
      {/* Ring */}
      <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        <svg width={52} height={52} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={26} cy={26} r={22} fill="none" stroke="var(--border)" strokeWidth={3} />
          <circle
            cx={26} cy={26} r={22} fill="none"
            stroke={isRunning ? "#C8F135" : "var(--border)"}
            strokeWidth={3}
            strokeDasharray={circumference}
            strokeDashoffset={isRunning ? strokeDashoffset : circumference}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isRunning ? "13px" : "11px", fontWeight: 700,
          color: isRunning ? "var(--brand)" : "var(--text-faint)",
        }}>
          {isRunning ? `${remaining}s` : "rest"}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "var(--text-soft)", fontWeight: 600 }}>
          {isRunning ? "Resting…" : "Rest timer"}
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setDuration(s as 60 | 90 | 120); start(s); }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: duration === s && isRunning ? "rgba(200,241,53,.4)" : "var(--border)",
                background: duration === s && isRunning ? "rgba(200,241,53,.1)" : "transparent",
                color: duration === s && isRunning ? "var(--brand)" : "var(--text-soft)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s}s
            </button>
          ))}
          {isRunning && (
            <button
              type="button"
              onClick={stop}
              style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-faint)", fontSize: "12px", cursor: "pointer" }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
