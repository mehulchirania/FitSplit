type IconProps = { className?: string };

export function Activity({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Bell({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Calendar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function CalendarDays({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
      <circle cx="8" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export function Dumbbell({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 5v14M18 5v14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 7h4M16 7h4M4 17h4M16 17h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function UsersRound({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 21a8 8 0 0 0-16 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="10" cy="8" r="5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Video({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Plus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Menu({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function UserRound({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function ArrowLeft({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function X({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Mail({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Settings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .54V20a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-.54-1H4a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 .54-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-.54V4a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 .54 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.2.35.38.68.54 1h.1a2 2 0 0 1 0 4h-.1c-.16.32-.34.65-.5 1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function Phone({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function ChevronDown({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
