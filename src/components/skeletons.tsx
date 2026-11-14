/**
 * Reusable skeleton shimmer primitives.
 *
 * Usage:
 *   <SkeletonCard />                  — generic card-shaped block
 *   <SkeletonText lines={3} />        — paragraph-shaped text lines
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

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="sk-card"
      style={{
        padding: "20px",
        borderRadius: 12,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
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

