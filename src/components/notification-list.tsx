"use client";

import Link from "next/link";
import type { Notification } from "@/types/domain";
import { clearUserNotifications } from "@/lib/firebase/actions";

// ─── Type icon mapping ────────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type.startsWith("pt_session")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (type === "program_assigned") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6.5 6.5h11M6.5 12h11M6.5 17.5H12" />
        <path d="M20 9V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
        <circle cx="18" cy="18" r="3" />
        <path d="m22 22-1.5-1.5" />
      </svg>
    );
  }
  if (type === "member_created") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    );
  }
  if (type === "contact_message") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    );
  }
  if (type === "exercise_request") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6.5 6h11M6.5 12h11M6.5 18h5" />
        <circle cx="18" cy="18" r="3" />
        <path d="m21 21-1.5-1.5" />
      </svg>
    );
  }
  if (type.startsWith("membership")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  // default: bell
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Relative timestamp ───────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// ─── Dismiss action ───────────────────────────────────────────────────────────

async function dismissNotification(id: string) {
  await clearUserNotifications([id]);
}

// ─── Row component ────────────────────────────────────────────────────────────

function NotificationRow({ item }: { item: Notification }) {
  const isUnread = !item.readAt;

  const inner = (
    <div className={`notif-row-inner${isUnread ? " notif-unread" : ""}`}>
      <span className={`notif-icon-wrap notif-icon-${item.type.startsWith("pt_") ? "pt" : item.type.startsWith("membership") ? "membership" : item.type}`}>
        <NotificationIcon type={item.type} />
      </span>
      <div className="notif-content">
        <div className="notif-title-row">
          <span className="notif-title">{item.title}</span>
          <span className="notif-time">{relativeTime(item.createdAt)}</span>
        </div>
        <p className="notif-body">{item.body}</p>
      </div>
      {item.actionHref && (
        <span className="notif-chevron" aria-hidden>›</span>
      )}
    </div>
  );

  const handleDismiss = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await dismissNotification(item.id);
  };

  return (
    <article className="notif-row" key={item.id}>
      {item.actionHref ? (
        <Link href={item.actionHref} className="notif-row-link">
          {inner}
        </Link>
      ) : (
        <div className="notif-row-link notif-row-static">{inner}</div>
      )}
      <button
        className="notif-dismiss"
        onClick={handleDismiss}
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </article>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function NotificationList({ items }: { items: Notification[] }) {
  if (items.length === 0) {
    return (
      <div className="notif-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <p>You&apos;re all caught up</p>
        <span>No new notifications</span>
      </div>
    );
  }

  return (
    <div className="notif-list">
      {items.map((item) => (
        <NotificationRow item={item} key={item.id} />
      ))}
    </div>
  );
}
