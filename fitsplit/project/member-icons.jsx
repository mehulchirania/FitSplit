// Icons for the member dashboard redesign.
const MIcon = ({ d, size = 20, stroke = 1.7, fill, ...rest }) => (
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

const MIcons = {
  Home: (p) => <MIcon {...p} d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-7H10v7H7a2 2 0 01-2-2v-9z" />,
  Dumbbell: (p) => <MIcon {...p} d={<>
    <path d="M6.5 6.5l11 11" />
    <path d="M3 9l3-3 3 3-3 3z" />
    <path d="M15 15l3-3 3 3-3 3z" />
    <path d="M2 12.5l1.5-1.5" />
    <path d="M22 11.5l-1.5 1.5" />
  </>} />,
  Chart: (p) => <MIcon {...p} d={<>
    <path d="M3 21V3" />
    <path d="M21 21H3" />
    <path d="M7 17v-5" />
    <path d="M12 17v-9" />
    <path d="M17 17v-12" />
  </>} />,
  User: (p) => <MIcon {...p} d={<>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </>} />,
  Flame: (p) => <MIcon {...p} d={<>
    <path d="M12 3s4 3 4 9a4 4 0 11-8 0c0-1.5.5-3 1.5-4.2C10 6 8.5 4.5 12 3z" />
    <path d="M12 13a1.5 1.5 0 010 3" />
  </>} />,
  Play: (p) => <MIcon {...p} fill="currentColor" stroke="none" d="M8 5l12 7-12 7z" />,
  PlayOutline: (p) => <MIcon {...p} d="M8 5l12 7-12 7z" />,
  Check: (p) => <MIcon {...p} d="M4 12l5 5L20 6" />,
  CheckCircle: (p) => <MIcon {...p} d={<>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-5" />
  </>} />,
  Plus: (p) => <MIcon {...p} d="M12 5v14M5 12h14" />,
  X: (p) => <MIcon {...p} d="M6 6l12 12M18 6L6 18" />,
  ChevR: (p) => <MIcon {...p} d="M9 6l6 6-6 6" />,
  ChevD: (p) => <MIcon {...p} d="M6 9l6 6 6-6" />,
  ChevL: (p) => <MIcon {...p} d="M15 6l-6 6 6 6" />,
  Calendar: (p) => <MIcon {...p} d={<>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>} />,
  Mail: (p) => <MIcon {...p} d={<>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 7 9-7" />
  </>} />,
  Bell: (p) => <MIcon {...p} d={<>
    <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
    <path d="M10 21a2 2 0 004 0" />
  </>} />,
  Heart: (p) => <MIcon {...p} d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" />,
  Apple: (p) => <MIcon {...p} d={<>
    <path d="M12 7c-2-3-7-2-7 3 0 5 4 11 7 11s7-6 7-11c0-5-5-6-7-3z" />
    <path d="M12 7V3" />
  </>} />,
  Activity: (p) => <MIcon {...p} d="M3 12h4l2-7 4 14 2-7h6" />,
  Trophy: (p) => <MIcon {...p} d={<>
    <path d="M8 4h8v6a4 4 0 01-8 0V4z" />
    <path d="M6 5H4a2 2 0 002 4" />
    <path d="M18 5h2a2 2 0 01-2 4" />
    <path d="M10 14v3l-1 3h6l-1-3v-3" />
  </>} />,
  Moon: (p) => <MIcon {...p} d="M20 14A8 8 0 0110 4a8 8 0 1010 10z" />,
  Settings: (p) => <MIcon {...p} d={<>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2-1.2L14 3h-4l-.5 2.5a7 7 0 00-2 1.2L5.1 5.8l-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9c.6.5 1.3.9 2 1.2L10 21h4l.5-2.5c.7-.3 1.4-.7 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
  </>} />,
  Sparkle: (p) => <MIcon {...p} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  TrendUp: (p) => <MIcon {...p} d={<>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </>} />,
  Clock: (p) => <MIcon {...p} d={<>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>} />,
  Pin: (p) => <MIcon {...p} d={<>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </>} />,
  Note: (p) => <MIcon {...p} d={<>
    <path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
    <path d="M8 9h7M8 13h7M8 17h4" />
  </>} />,
  Refresh: (p) => <MIcon {...p} d={<>
    <path d="M4 4v6h6" />
    <path d="M20 20v-6h-6" />
    <path d="M20 9a8 8 0 00-14-3M4 15a8 8 0 0014 3" />
  </>} />,
  Edit: (p) => <MIcon {...p} d={<>
    <path d="M14 4l6 6L8 22H2v-6L14 4z" />
    <path d="M13 5l6 6" />
  </>} />,
  Filter: (p) => <MIcon {...p} d="M4 5h16l-6 8v6l-4-2v-4z" />,
  Search: (p) => <MIcon {...p} d={<>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </>} />,
  More: (p) => <MIcon {...p} d={<>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" />
  </>} />,
  Send: (p) => <MIcon {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  Lightning: (p) => <MIcon {...p} d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
};

window.MIcons = MIcons;
window.MIcon = MIcon;
