interface StatusBadgeProps {
  status: string;
  /** Map of status string → colour token. Defaults applied for common strings. */
  colorMap?: Record<string, string>;
}

const DEFAULT_COLORS: Record<string, string> = {
  active: "var(--brand)",
  approved: "var(--brand)",
  completed: "var(--brand)",
  pending: "#f59e0b",
  expiring_soon: "#f59e0b",
  scheduled: "#3b82f6",
  expired: "#ef4444",
  rejected: "#ef4444",
  cancelled: "#6b7280",
  inactive: "#6b7280",
  paused: "#6b7280",
};

export function StatusBadge({ status, colorMap }: StatusBadgeProps) {
  const map = { ...DEFAULT_COLORS, ...(colorMap ?? {}) };
  const color = map[status] ?? "#6b7280";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className="status-badge"
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        borderRadius: "var(--radius-sm)",
        padding: "2px 8px",
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
