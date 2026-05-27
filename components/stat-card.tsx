import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  sub?: string;
  accent?: "green" | "amber" | "red" | "blue" | "default";
  href?: string;
}

const accentVars: Record<NonNullable<StatCardProps["accent"]>, string> = {
  green: "var(--brand)",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  default: "var(--border)",
};

export function StatCard({ label, value, icon, sub, accent = "default", href }: StatCardProps) {
  const borderColor = accentVars[accent];

  const inner = (
    <div
      className="stat-card"
      style={{ borderTop: `3px solid ${borderColor}` }}
    >
      <div className="stat-card-top">
        {icon && <span className="stat-card-icon">{icon}</span>}
        <span className="stat-card-value">{value}</span>
      </div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="stat-card-link">
        {inner}
      </a>
    );
  }

  return inner;
}
