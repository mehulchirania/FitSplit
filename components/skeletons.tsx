/**
 * Reusable skeleton shimmer primitives.
 *
 * Usage:
 *   <SkeletonCard />                  — generic card-shaped block
 *   <SkeletonList rows={6} />         — vertical list of shimmer rows
 *   <SkeletonText lines={3} />        — paragraph-shaped text lines
 *   <SkeletonStat />                  — single metric tile (count + label)
 *   <SkeletonAvatar />                — circular avatar placeholder
 *   <SkeletonBanner />                — full-width hero / banner strip
 *
 * All components accept an optional className string for layout overrides.
 */

import React from "react";

// ─── Base pulse block ─────────────────────────────────────────────────────────

interface PulseProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonPulse({ className = "", style }: PulseProps) {
  return (
    <div
      className={`sk-pulse ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// ─── Composed skeletons ───────────────────────────────────────────────────────

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <SkeletonPulse
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0 }}
    />
  );
}

export function SkeletonText({
  lines = 2,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={`sk-text-group ${className}`}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse
          key={i}
          style={{
            height: 14,
            borderRadius: 6,
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div
      className="sk-stat"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "16px 20px",
        borderRadius: 12,
        background: "var(--card-bg, #1a1a2e)",
        border: "1px solid var(--border-color, rgba(255,255,255,0.07))",
      }}
      aria-hidden="true"
    >
      <SkeletonPulse style={{ height: 28, width: 64, borderRadius: 6 }} />
      <SkeletonPulse style={{ height: 12, width: 96, borderRadius: 4 }} />
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="sk-card"
      style={{
        padding: "20px",
        borderRadius: 12,
        background: "var(--card-bg, #1a1a2e)",
        border: "1px solid var(--border-color, rgba(255,255,255,0.07))",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: height,
      }}
      aria-hidden="true"
    >
      <SkeletonPulse style={{ height: 16, width: "50%", borderRadius: 6 }} />
      <SkeletonPulse style={{ height: 12, width: "80%", borderRadius: 4 }} />
      <SkeletonPulse style={{ height: 12, width: "65%", borderRadius: 4 }} />
    </div>
  );
}

export function SkeletonList({
  rows = 5,
  withAvatar = true,
}: {
  rows?: number;
  withAvatar?: boolean;
}) {
  return (
    <div
      className="sk-list"
      style={{ display: "flex", flexDirection: "column", gap: 1 }}
      aria-hidden="true"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 20px",
            background: "var(--card-bg, #1a1a2e)",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.05))",
          }}
        >
          {withAvatar && <SkeletonAvatar size={36} />}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <SkeletonPulse style={{ height: 14, width: `${55 + (i % 3) * 12}%`, borderRadius: 5 }} />
            <SkeletonPulse style={{ height: 11, width: `${35 + (i % 4) * 8}%`, borderRadius: 4 }} />
          </div>
          <SkeletonPulse style={{ height: 24, width: 64, borderRadius: 20 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <SkeletonPulse
      style={{
        height: 72,
        borderRadius: 12,
        width: "100%",
      }}
    />
  );
}

export function SkeletonStatsRow({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: 12,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}
