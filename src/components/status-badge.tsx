interface StatusBadgeProps {
  status: string;
  /** Map of status string → colour token. Defaults applied for common strings. */
  colorMap?: Record<string, string>;
}

const DEFAULT_COLORS: Record<string, string> = {
  active: "var(--brand)",
  approved: "var(--brand)",
  completed: "var(--brand)",
  pending: "var(--warning)",
  expiring_soon: "var(--warning)",
  scheduled: "var(--info)",
  expired: "var(--danger)",
  rejected: "var(--danger)",
  cancelled: "var(--text-soft)",
  inactive: "var(--text-soft)",
  paused: "var(--text-soft)",
};

// Each foreground token above has a matching `-soft` background token tuned
// for AA contrast in both themes (see 00-base-shell.css). Any custom colour
// passed via `colorMap` that isn't one of these falls back to a generic
// color-mix wash instead of a hardcoded alpha-hex suffix, which only ever
// worked for literal hex strings and silently broke for `var(...)` colours
// (e.g. `var(--brand)22` is not valid CSS).
const SOFT_BACKGROUND: Record<string, string> = {
  "var(--brand)": "var(--brand-soft)",
  "var(--warning)": "var(--warning-soft)",
  "var(--info)": "var(--info-soft)",
  "var(--danger)": "var(--danger-soft)",
  "var(--text-soft)": "var(--bg-subtle)",
};

export function StatusBadge({ status, colorMap }: StatusBadgeProps) {
  const map = { ...DEFAULT_COLORS, ...(colorMap ?? {}) };
  const color = map[status] ?? "var(--text-soft)";
  const background = SOFT_BACKGROUND[color] ?? `color-mix(in srgb, ${color} 16%, transparent)`;
  const label = status.replace(/_/g, " ");

  return (
    <span
      className="status-badge"
      style={{
        background,
        color,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
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
