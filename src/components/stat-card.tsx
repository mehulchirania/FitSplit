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
  amber: "var(--warning)",
  red: "var(--danger)",
  blue: "var(--info)",
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
