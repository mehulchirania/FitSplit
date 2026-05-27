// Shared inline SVG icons for the FitSplit members redesign.
// Minimal stroke icons in Feather/Lucide style.
const Icon = ({ d, size = 16, stroke = 1.7, fill, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill || "none"}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  Search: (p) => (
    <Icon
      {...p}
      d={<>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </>}
    />
  ),
  Plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Filter: (p) => <Icon {...p} d="M4 5h16M7 12h10M10 19h4" />,
  Sort: (p) => (
    <Icon {...p} d={<>
      <path d="M7 4v16" />
      <path d="M4 7l3-3 3 3" />
      <path d="M17 20V4" />
      <path d="M14 17l3 3 3-3" />
    </>} />
  ),
  Check: (p) => <Icon {...p} d="M4 12l5 5L20 6" />,
  X: (p) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />,
  More: (p) => <Icon {...p} d={<>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" />
  </>} />,
  ChevDown: (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  ChevRight: (p) => <Icon {...p} d="M9 6l6 6-6 6" />,
  ChevLeft: (p) => <Icon {...p} d="M15 6l-6 6 6 6" />,
  Users: (p) => <Icon {...p} d={<>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c.6-3.2 3.2-5 6-5s5.4 1.8 6 5" />
    <path d="M16 5.5a3.2 3.2 0 010 6" />
    <path d="M21 20c-.4-2.2-1.8-3.8-3.8-4.6" />
  </>} />,
  Activity: (p) => <Icon {...p} d="M3 12h4l2-7 4 14 2-7h6" />,
  Dumbbell: (p) => <Icon {...p} d={<>
    <path d="M6.5 6.5l11 11" />
    <path d="M3 9l3-3 3 3-3 3z" />
    <path d="M15 15l3-3 3 3-3 3z" />
    <path d="M2 12.5l1.5-1.5" />
    <path d="M22 11.5l-1.5 1.5" />
  </>} />,
  Bell: (p) => <Icon {...p} d={<>
    <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
    <path d="M10 21a2 2 0 004 0" />
  </>} />,
  Calendar: (p) => <Icon {...p} d={<>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>} />,
  Mail: (p) => <Icon {...p} d={<>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 7 9-7" />
  </>} />,
  Phone: (p) => <Icon {...p} d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" />,
  Pause: (p) => <Icon {...p} d={<>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </>} />,
  Play: (p) => <Icon {...p} d="M7 5l12 7-12 7z" />,
  Repeat: (p) => <Icon {...p} d={<>
    <path d="M17 2l3 3-3 3" />
    <path d="M3 11V9a4 4 0 014-4h13" />
    <path d="M7 22l-3-3 3-3" />
    <path d="M21 13v2a4 4 0 01-4 4H4" />
  </>} />,
  AlertTriangle: (p) => <Icon {...p} d={<>
    <path d="M10.3 3.7L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z" />
    <path d="M12 9v5" />
    <path d="M12 17.5h.01" />
  </>} />,
  Sparkle: (p) => <Icon {...p} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  Trophy: (p) => <Icon {...p} d={<>
    <path d="M8 4h8v6a4 4 0 01-8 0V4z" />
    <path d="M6 5H4a2 2 0 002 4" />
    <path d="M18 5h2a2 2 0 01-2 4" />
    <path d="M10 14v3l-1 3h6l-1-3v-3" />
  </>} />,
  Settings: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2L5.1 5.8l-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
  </>} />,
  Eye: (p) => <Icon {...p} d={<>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>} />,
  Grid: (p) => <Icon {...p} d={<>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>} />,
  List: (p) => <Icon {...p} d={<>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </>} />,
  Columns: (p) => <Icon {...p} d={<>
    <rect x="3" y="4" width="6" height="16" rx="1.5" />
    <rect x="11" y="4" width="6" height="16" rx="1.5" />
    <rect x="19" y="4" width="2" height="16" rx="1" />
  </>} />,
  Download: (p) => <Icon {...p} d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" />,
  Inbox: (p) => <Icon {...p} d={<>
    <path d="M3 13l3-9h12l3 9" />
    <path d="M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6" />
    <path d="M8 13a4 4 0 008 0" />
  </>} />,
  Trash: (p) => <Icon {...p} d={<>
    <path d="M4 6h16" />
    <path d="M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </>} />,
  Tag: (p) => <Icon {...p} d={<>
    <path d="M2 7v6a2 2 0 00.6 1.4l7 7a2 2 0 002.8 0l6-6a2 2 0 000-2.8l-7-7A2 2 0 0010 5H4a2 2 0 00-2 2z" />
    <circle cx="6.5" cy="9" r="1" fill="currentColor" stroke="none" />
  </>} />
};

window.Icons = Icons;
window.Icon = Icon;
